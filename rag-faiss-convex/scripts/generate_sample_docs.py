import os
import json
import random
from datetime import datetime, timedelta

BASE = "data"

SOURCES = {
    "gdrive": [
        ("Q1_Budget_Notes.md", "Q1 Budget Notes"),
        ("Hiring_Plan.md", "Hiring Plan"),
    ],
    "confluence": [
        ("Onboarding_Runbook.md", "Onboarding Runbook"),
        ("Incident_Response.md", "Incident Response"),
    ],
    "slack": [
        ("eng_general.json", "Slack Export: #eng-general"),
        ("finance_team.json", "Slack Export: #finance-team"),
    ],
}

def ensure_dirs():
    os.makedirs(BASE, exist_ok=True)
    for src in SOURCES:
        os.makedirs(os.path.join(BASE, src), exist_ok=True)

def write_md(path: str, title: str, body: str):
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n{body}\n")

def make_paragraph(topic: str) -> str:
    bullets = [
        f"- Key point about {topic}: {random.choice(['process', 'policy', 'timeline', 'ownership'])}",
        f"- Risk: {random.choice(['latency', 'cost', 'compliance', 'handoff'])}",
        f"- Next step: {random.choice(['review', 'approve', 'ship', 'audit'])}",
    ]
    return "\n".join(bullets)

def generate_gdrive_docs():
    for filename, title in SOURCES["gdrive"]:
        body = "\n\n".join([
            "These are internal notes stored in Google Drive.",
            make_paragraph("budget"),
            make_paragraph("headcount"),
            "Confidential: Finance-related details included."
        ])
        write_md(os.path.join(BASE, "gdrive", filename), title, body)

def generate_confluence_docs():
    for filename, title in SOURCES["confluence"]:
        body = "\n\n".join([
            "This page is maintained in Confluence.",
            make_paragraph("onboarding"),
            make_paragraph("incident response"),
            "Reminder: follow the runbook exactly during incidents."
        ])
        write_md(os.path.join(BASE, "confluence", filename), title, body)

def generate_slack_exports():
    now = datetime.utcnow()
    channels = {
        "eng_general.json": ["deploy", "pager", "incident", "latency", "db migration"],
        "finance_team.json": ["reimbursements", "approval", "budget", "invoice", "expense policy"],
    }

    for filename, keywords in channels.items():
        messages = []
        for i in range(50):
            ts = (now - timedelta(minutes=15*i)).timestamp()
            messages.append({
                "user": random.choice(["alice", "bob", "carol", "dave"]),
                "ts": str(ts),
                "text": f"{random.choice(keywords)} update: {random.choice(['looks good', 'needs review', 'blocked', 'approved'])}"
            })

        path = os.path.join(BASE, "slack", filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"channel": filename.replace(".json",""), "messages": messages}, f, indent=2)

def main():
    ensure_dirs()
    generate_gdrive_docs()
    generate_confluence_docs()
    generate_slack_exports()
    print("Generated sample docs under ./data/{gdrive,confluence,slack}")

if __name__ == "__main__":
    main()
