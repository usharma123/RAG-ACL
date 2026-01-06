import os, requests
from dotenv import load_dotenv

load_dotenv()
CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")

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

if __name__ == "__main__":
    alice = convex_mutation("users:create", {
        "tenantId": "acme",
        "email": "alice@acme.com",
        "role": "member",
        "allowedSources": ["public", "finance"],
    })
    bob = convex_mutation("users:create", {
        "tenantId": "acme",
        "email": "bob@acme.com",
        "role": "member",
        "allowedSources": ["public"],
    })
    print("alice userId:", alice)
    print("bob userId:", bob)
