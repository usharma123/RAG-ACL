#!/usr/bin/env python3
"""Test ACL enforcement for RAG system with new seeded sources."""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

CONVEX_URL = os.environ["CONVEX_URL"].rstrip("/")
# Use host.docker.internal when running in Docker, localhost otherwise
API_URL = os.getenv("API_URL", "http://host.docker.internal:8000")
TENANT_ID = "acme"

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

def chat(user_id: str, message: str):
    r = requests.post(
        f"{API_URL}/chat",
        json={"message": message},
        headers={"Content-Type": "application/json", "X-User-Id": user_id},
        timeout=60,
    )
    return r.status_code, r.json()

def test_acl():
    print("=" * 60)
    print("RAG ACL Test Suite")
    print("=" * 60)

    # Create test users with different source permissions
    # Using unique emails to avoid conflicts with pre-existing users
    import time
    ts = int(time.time())
    test_users = [
        {
            "email": f"test-alice-{ts}@acme.com",
            "role": "engineer",
            "allowedSources": ["gdrive", "confluence", "slack"],  # Full access
        },
        {
            "email": f"test-bob-{ts}@acme.com",
            "role": "finance",
            "allowedSources": ["gdrive"],  # Only gdrive
        },
        {
            "email": f"test-carol-{ts}@acme.com",
            "role": "hr",
            "allowedSources": ["confluence"],  # Only confluence
        },
        {
            "email": f"test-dave-{ts}@acme.com",
            "role": "external",
            "allowedSources": [],  # No access
        },
    ]

    user_ids = {}
    print("\n[1] Creating test users...")
    for u in test_users:
        user_id = convex_mutation("users:create", {
            "tenantId": TENANT_ID,
            "email": u["email"],
            "role": u["role"],
            "allowedSources": u["allowedSources"],
        })
        user_ids[u["email"]] = user_id
        print(f"  ✓ {u['email']} -> {user_id} (sources: {u['allowedSources']})")

    # Test queries
    test_queries = [
        ("budget", "gdrive"),      # Should match Q1_Budget_Notes in gdrive
        ("onboarding", "confluence"),  # Should match Onboarding_Runbook in confluence
        ("deploy", "slack"),       # Should match eng_general slack export
    ]

    print("\n[2] Testing ACL enforcement...")
    results = []

    for query, expected_source in test_queries:
        print(f"\n  Query: '{query}' (expected source: {expected_source})")
        print("  " + "-" * 50)

        for u in test_users:
            user_id = user_ids[u["email"]]
            status, resp = chat(user_id, query)

            if status != 200:
                if u["allowedSources"] == []:
                    print(f"    ✓ {u['email']}: No sources (as expected)")
                    results.append(("PASS", u["email"], query, "No sources"))
                else:
                    print(f"    ✗ {u['email']}: Error {status} - {resp}")
                    results.append(("FAIL", u["email"], query, f"Error {status}"))
                continue

            retrieved = resp.get("retrieved", [])
            sources_hit = set(r["sourceKey"] for r in retrieved)
            allowed = set(u["allowedSources"])

            # Check: user should only see sources they're allowed to access
            unauthorized = sources_hit - allowed
            if unauthorized:
                print(f"    ✗ {u['email']}: UNAUTHORIZED access to {unauthorized}!")
                results.append(("FAIL", u["email"], query, f"Unauthorized: {unauthorized}"))
            elif expected_source in allowed and expected_source in sources_hit:
                print(f"    ✓ {u['email']}: Retrieved from {sources_hit} (authorized)")
                results.append(("PASS", u["email"], query, f"Got {sources_hit}"))
            elif expected_source not in allowed and expected_source not in sources_hit:
                print(f"    ✓ {u['email']}: Correctly denied {expected_source}, got {sources_hit or 'nothing'}")
                results.append(("PASS", u["email"], query, f"Denied {expected_source}"))
            else:
                print(f"    ? {u['email']}: Got {sources_hit}, allowed={allowed}")
                results.append(("WARN", u["email"], query, f"Got {sources_hit}"))

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r[0] == "PASS")
    failed = sum(1 for r in results if r[0] == "FAIL")
    warned = sum(1 for r in results if r[0] == "WARN")
    print(f"  PASSED: {passed}")
    print(f"  FAILED: {failed}")
    print(f"  WARNINGS: {warned}")

    if failed > 0:
        print("\n❌ ACL TESTS FAILED - Security issue detected!")
        sys.exit(1)
    else:
        print("\n✅ All ACL tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    test_acl()
