import os
from typing import Optional
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from api.faiss_store import FaissPerSourceStore

load_dotenv()

CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")
oa = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url=os.getenv("OPENAI_BASE_URL"),
)
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o-mini")

# All available sources in the system (must match convex/users.ts AVAILABLE_SOURCES)
ALL_SOURCES = ["gdrive", "confluence", "slack", "notion", "public", "finance", "engineering", "hr"]

faiss_store = FaissPerSourceStore()


def get_allowed_sources(user: dict) -> list:
    """Get allowed sources for a user. Admins have access to all sources."""
    if user.get("role") == "admin":
        return ALL_SOURCES
    return user.get("allowedSources", [])


app = FastAPI()

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def convex_call(kind: str, path: str, args: dict, token: Optional[str] = None):
    """Call Convex API with optional auth token."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    r = requests.post(
        f"{CONVEX_URL}/api/{kind}",
        json={"path": path, "args": args, "format": "json"},
        headers=headers,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise HTTPException(500, detail=data)
    return data["value"]


def get_auth_token(request: Request) -> Optional[str]:
    """Extract Convex Auth token from request."""
    # Check Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    # Check cookies for Convex Auth session
    # Convex Auth stores session in a cookie
    return request.cookies.get("__convexAuthToken")


def _require_user(request: Request) -> dict:
    """Get current user from Convex Auth session."""
    token = get_auth_token(request)
    
    # For development, also allow x-user-id header
    if not token and os.getenv("ALLOW_HEADER_AUTH", "").lower() == "true":
        user_id = request.headers.get("x-user-id")
        if user_id:
            user = convex_call("query", "users:get", {"userId": user_id})
            if user:
                return user
    
    if not token:
        raise HTTPException(401, "Not authenticated")
    
    # Call the currentUser query with the auth token
    # This validates the session and returns the user
    try:
        user = convex_call("query", "users:currentUser", {}, token=token)
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except Exception as e:
        raise HTTPException(401, f"Authentication failed: {str(e)}")


class ChatIn(BaseModel):
    message: str


class FeedbackIn(BaseModel):
    logId: str
    helpful: bool
    comment: Optional[str] = None


def _make_snippet(text: str, max_len: int = 220) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."


@app.get("/me")
def me(request: Request):
    user = _require_user(request)
    return {
        "id": user["_id"],
        "email": user.get("email"),
        "role": user["role"],
        "allowedSources": get_allowed_sources(user),
        "tenantId": user["tenantId"],
    }


@app.get("/documents/{doc_id}")
def get_document(doc_id: str, request: Request):
    user = _require_user(request)
    tenant_id = user["tenantId"]
    allowed_sources = set(get_allowed_sources(user))

    doc = convex_call("query", "documents:get", {"id": doc_id, "tenantId": tenant_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc["sourceKey"] not in allowed_sources:
        raise HTTPException(403, "Access denied")

    return {
        "id": doc["_id"],
        "title": doc["title"],
        "sourceKey": doc["sourceKey"],
        "rawText": doc["rawText"],
        "sourceUrl": doc.get("sourceUrl"),
    }


@app.post("/feedback")
def feedback(payload: FeedbackIn, request: Request):
    user = _require_user(request)
    
    # Build args, excluding None values (Convex doesn't accept null for optional fields)
    args = {
        "logId": payload.logId,
        "userId": user["_id"],
        "helpful": payload.helpful,
    }
    if payload.comment is not None:
        args["comment"] = payload.comment
    
    convex_call("mutation", "logs:addFeedback", args)
    return {"status": "ok"}


@app.post("/chat")
def chat(payload: ChatIn, request: Request):
    user = _require_user(request)

    tenant_id = user["tenantId"]
    allowed_sources = get_allowed_sources(user)
    if not allowed_sources:
        log_id = convex_call(
            "mutation",
            "logs:add",
            {
                "tenantId": tenant_id,
                "userId": user["_id"],
                "message": payload.message,
                "answer": "No sources available for this user.",
                "allowedSources": allowed_sources,
                "retrieved": [],
            },
        )
        return {"answer": "No sources available for this user.", "retrieved": [], "logId": log_id}

    emb = oa.embeddings.create(model=EMBED_MODEL, input=payload.message).data[0].embedding

    # Only search allowed FAISS indexes (core authorization guarantee)
    hits = faiss_store.search(tenant_id, allowed_sources, emb, top_k_per_source=8)[:8]
    chunk_ids = [cid for (cid, _, _) in hits]

    chunks = convex_call("query", "chunks:getMany", {"ids": chunk_ids, "tenantId": tenant_id})
    by_id = {c["_id"]: c for c in chunks}

    # Preserve FAISS order + defense-in-depth tenant and source check
    allowed = set(allowed_sources)
    ordered = [by_id[cid] for cid in chunk_ids if cid in by_id]
    ordered = [c for c in ordered if c["tenantId"] == tenant_id and c["sourceKey"] in allowed]

    context = "\n\n".join([f"[source={c['sourceKey']}]\n{c['text']}" for c in ordered])

    resp = oa.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {
                "role": "system",
                "content": "Answer using ONLY the provided context. If missing, say you don't know.",
            },
            {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION:\n{payload.message}"},
        ],
    )

    doc_ids = list({c["docId"] for c in ordered})
    docs = convex_call("query", "documents:getMany", {"ids": doc_ids, "tenantId": tenant_id})
    doc_by_id = {d["_id"]: d for d in docs}

    retrieved = []
    retrieved_for_log = []
    for chunk_id, score, source_key in hits:
        chunk = by_id.get(chunk_id)
        if not chunk or chunk["tenantId"] != tenant_id or chunk["sourceKey"] not in allowed:
            continue
        doc = doc_by_id.get(chunk["docId"])
        if not doc:
            continue
        retrieved.append(
            {
                "sourceKey": source_key,
                "score": score,
                "docId": chunk["docId"],
                "docTitle": doc["title"],
                "chunkId": chunk["_id"],
                "chunkIndex": chunk["chunkIndex"],
                "snippet": _make_snippet(chunk["text"]),
                "chunkText": chunk["text"],
                "sourceUrl": doc.get("sourceUrl"),
            }
        )
        retrieved_for_log.append(
            {
                "sourceKey": source_key,
                "score": score,
                "docId": chunk["docId"],
                "docTitle": doc["title"],
                "chunkId": chunk["_id"],
                "chunkIndex": chunk["chunkIndex"],
            }
        )

    log_id = convex_call(
        "mutation",
        "logs:add",
        {
            "tenantId": tenant_id,
            "userId": user["_id"],
            "message": payload.message,
            "answer": resp.choices[0].message.content,
            "allowedSources": allowed_sources,
            "retrieved": retrieved_for_log,
        },
    )

    return {
        "answer": resp.choices[0].message.content,
        "retrieved": retrieved,
        "logId": log_id,
    }
