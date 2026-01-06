import os, requests
from dotenv import load_dotenv
from openai import OpenAI
from api.faiss_store import FaissPerSourceStore

load_dotenv()
CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")
oa = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

faiss_store = FaissPerSourceStore()

def convex_mutation(path: str, args: dict):
    r = requests.post(
        f"{CONVEX_URL}/api/mutation",
        json={"path": path, "args": args, "format": "json"},
        headers={"Content-Type": "application/json"},
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("status") != "success":
        raise RuntimeError(data)
    return data["value"]

def chunk_text(text: str, max_chars: int = 1200):
    chunks, cur, cur_len = [], [], 0
    for para in text.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        if cur and cur_len + len(para) > max_chars:
            chunks.append("\n\n".join(cur))
            cur, cur_len = [], 0
        cur.append(para)
        cur_len += len(para)
    if cur:
        chunks.append("\n\n".join(cur))
    return chunks

def embed(texts):
    out = oa.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in out.data]

def ingest_doc(tenant_id: str, source_key: str, title: str, raw_text: str):
    doc_id = convex_mutation("ingest:addDocument", {
        "tenantId": tenant_id,
        "sourceKey": source_key,
        "title": title,
        "rawText": raw_text,
    })

    pieces = chunk_text(raw_text)
    vectors = embed(pieces)

    chunk_rows = [{"chunkIndex": i, "text": pieces[i]} for i in range(len(pieces))]
    chunk_ids = convex_mutation("ingest:addChunks", {
        "tenantId": tenant_id,
        "sourceKey": source_key,
        "docId": doc_id,
        "chunks": chunk_rows,
    })

    faiss_store.add(tenant_id, source_key, vectors, chunk_ids)
    print("ingested:", title, "chunks:", len(chunk_ids))

if __name__ == "__main__":
    ingest_doc(
        "acme", "finance", "Finance Policy",
        "Finance policy: reimbursements require manager approval.\n\nOnly finance users should see this."
    )
    ingest_doc(
        "acme", "public", "Public Handbook",
        "Public handbook: office hours are 9-5.\n\nEveryone can see this."
    )
