import os, requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
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

faiss_store = FaissPerSourceStore()
app = FastAPI()

def convex_call(kind: str, path: str, args: dict):
    r = requests.post(
        f"{CONVEX_URL}/api/{kind}",
        json={"path": path, "args": args, "format": "json"},
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise HTTPException(500, detail=data)
    return data["value"]

class ChatIn(BaseModel):
    message: str

@app.post("/chat")
def chat(payload: ChatIn, x_user_id: str = Header(...)):
    # Authorization-only MVP: caller supplies assumed identity
    user = convex_call("query", "users:get", {"userId": x_user_id})
    if not user:
        raise HTTPException(404, "Unknown user")

    tenant_id = user["tenantId"]
    allowed_sources = user["allowedSources"]
    if not allowed_sources:
        return {"answer": "No sources available for this user.", "retrieved": []}

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
            {"role": "system", "content": "Answer using ONLY the provided context. If missing, say you don't know."},
            {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION:\n{payload.message}"},
        ],
    )

    return {
        "answer": resp.choices[0].message.content,
        "retrieved": [{"sourceKey": s, "score": sc} for (_, sc, s) in hits],
    }
