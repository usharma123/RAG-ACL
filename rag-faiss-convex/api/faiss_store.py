import os, json, threading
from typing import List, Tuple, Dict
import numpy as np
import faiss

def _normalize(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v, axis=1, keepdims=True) + 1e-12
    return v / norm

class FaissPerSourceStore:
    def __init__(self, base_dir="faiss_data"):
        self.base_dir = base_dir
        self._lock = threading.Lock()
        self._cache: Dict[Tuple[str, str], Tuple[faiss.Index, List[str]]] = {}

    def _paths(self, tenant: str, source: str):
        d = os.path.join(self.base_dir, tenant)
        os.makedirs(d, exist_ok=True)
        return (
            os.path.join(d, f"{source}.index"),
            os.path.join(d, f"{source}.ids.json"),
        )

    def _load(self, tenant: str, source: str, dim: int):
        key = (tenant, source)
        if key in self._cache:
            return self._cache[key]

        index_path, ids_path = self._paths(tenant, source)

        if os.path.exists(index_path) and os.path.exists(ids_path):
            index = faiss.read_index(index_path)
            with open(ids_path, "r") as f:
                ids = json.load(f)
        else:
            index = faiss.IndexFlatIP(dim)  # cosine via normalized vectors
            ids = []

        self._cache[key] = (index, ids)
        return index, ids

    def add(self, tenant: str, source: str, vectors: List[List[float]], chunk_ids: List[str]):
        xb = np.array(vectors, dtype=np.float32)
        dim = xb.shape[1]
        xb = _normalize(xb)

        with self._lock:
            index, ids = self._load(tenant, source, dim)
            if index.d != dim:
                raise ValueError(f"dim mismatch: index.d={index.d}, new={dim}")

            index.add(xb)
            ids.extend(chunk_ids)

            index_path, ids_path = self._paths(tenant, source)
            faiss.write_index(index, index_path)
            with open(ids_path, "w") as f:
                json.dump(ids, f)

    def search(self, tenant: str, sources: List[str], qvec: List[float], top_k_per_source: int = 8):
        q = np.array([qvec], dtype=np.float32)
        q = _normalize(q)

        scored: List[Tuple[str, float, str]] = []
        with self._lock:
            for source in sources:
                index, ids = self._load(tenant, source, dim=q.shape[1])
                if index.ntotal == 0:
                    continue
                D, I = index.search(q, top_k_per_source)
                for score, idx in zip(D[0].tolist(), I[0].tolist()):
                    # Guard against index/ids mismatch (e.g., from crash during write)
                    if idx >= 0 and idx < len(ids):
                        scored.append((ids[idx], float(score), source))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored
