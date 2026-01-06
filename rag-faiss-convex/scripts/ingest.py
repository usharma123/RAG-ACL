import os, requests
from dotenv import load_dotenv
from openai import OpenAI
from api.faiss_store import FaissPerSourceStore

load_dotenv()
CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")
oa = OpenAI(
    api_key=os.environ["OPENAI_API_KEY"],
    base_url=os.getenv("OPENAI_BASE_URL"),
)
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
    separator = "\n\n"
    sep_len = len(separator)
    for para in text.split(separator):
        para = para.strip()
        if not para:
            continue
        # Account for separator length when calculating if we'd exceed max_chars
        added_len = len(para) + (sep_len if cur else 0)
        if cur and cur_len + added_len > max_chars:
            chunks.append(separator.join(cur))
            cur, cur_len = [], 0
            added_len = len(para)  # No separator for first item
        cur.append(para)
        cur_len += added_len
    if cur:
        chunks.append(separator.join(cur))
    return chunks

def embed(texts):
    out = oa.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in out.data]

def ingest_doc(tenant_id: str, source_key: str, title: str, raw_text: str, source_url: str | None = None):
    doc_args = {
        "tenantId": tenant_id,
        "sourceKey": source_key,
        "title": title,
        "rawText": raw_text,
    }
    if source_url:
        doc_args["sourceUrl"] = source_url

    doc_id = convex_mutation("ingest:addDocument", doc_args)

    pieces = chunk_text(raw_text)
    if not pieces:
        print("skipped (no content):", title)
        return

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
