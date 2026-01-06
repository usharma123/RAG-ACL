# RAG-ACL

A multi-tenant Retrieval-Augmented Generation (RAG) system with role-based access control. Users can only query documents from sources they are authorized to access.

## Overview

RAG-ACL combines vector similarity search with strict access control to ensure users only receive answers derived from documents they have permission to view. The system uses:

- **FAISS** for fast vector similarity search (per-tenant, per-source indexes)
- **Convex** for database storage (users, documents, chunks)
- **OpenAI/OpenRouter** for embeddings and chat completions
- **FastAPI** for the backend API
- **React + Bun** for the frontend

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React UI      │────▶│   Bun Server    │────▶│   FastAPI       │
│   (Port 3000)   │     │   (Proxy)       │     │   (Port 8000)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                    ┌────────────────────┼────────────────────┐
                                    │                    │                    │
                                    ▼                    ▼                    ▼
                             ┌──────────┐         ┌──────────┐         ┌──────────┐
                             │  FAISS   │         │  Convex  │         │  OpenAI  │
                             │  Index   │         │    DB    │         │          │
                             └──────────┘         └──────────┘         └──────────┘
```

## Access Control Model

Each user has:
- A `tenantId` for multi-tenant isolation
- An `allowedSources` list (e.g., `["public", "finance"]`)

When a user sends a query:
1. The system retrieves only from FAISS indexes matching their allowed sources
2. Chunks are filtered by tenant ID at the database level
3. A defense-in-depth check validates source access before returning results

Example:
- **Alice** has access to `["public", "finance"]` - can query all documents
- **Bob** has access to `["public"]` - cannot see finance documents

## Prerequisites

- Docker and Docker Compose
- Bun (https://bun.sh)
- A Convex account (https://convex.dev)
- An OpenAI API key or OpenRouter API key

## Setup

### 1. Clone and Install Dependencies

```bash
cd rag-faiss-convex
bun install
```

### 2. Configure Environment

Create a `.env` file with:

```env
CONVEX_DEPLOYMENT=<your-convex-deployment>
CONVEX_URL=<your-convex-url>

OPENAI_API_KEY=<your-api-key>
OPENAI_BASE_URL=https://openrouter.ai/api/v1  # Optional: for OpenRouter

EMBED_MODEL=openai/text-embedding-3-small
CHAT_MODEL=openai/gpt-4o-mini
```

### 3. Start Convex

```bash
bun run convex:dev
```

### 4. Build and Run the API Server

```bash
docker build -t rag-api .
docker run -d --name rag-api -p 8000:8000 --env-file .env -v $(pwd)/faiss_data:/app/faiss_data rag-api
```

### 5. Seed Test Data

```bash
# Create test users (Alice and Bob)
docker exec rag-api python -m scripts.seed_users

# Ingest sample documents
docker exec rag-api python -m scripts.ingest
```

### 6. Start the Frontend

```bash
bun run dev
```

The application will be available at http://localhost:3000

## Usage

### Web Interface

Open http://localhost:3000 in your browser. Use the dropdown to switch between users and observe how access control affects query results.

### API

**POST /chat**

Send a message and receive an AI-generated response based on authorized documents.

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{"message": "What are the office hours?"}'
```

Response:
```json
{
  "answer": "The office hours are 9-5.",
  "retrieved": [
    {"sourceKey": "public", "score": 0.71},
    {"sourceKey": "finance", "score": 0.15}
  ]
}
```

## Project Structure

```
rag-faiss-convex/
├── api/
│   ├── main.py           # FastAPI application
│   └── faiss_store.py    # FAISS vector store management
├── convex/
│   ├── schema.ts         # Database schema
│   ├── users.ts          # User queries/mutations
│   ├── chunks.ts         # Chunk retrieval
│   └── ingest.ts         # Document ingestion
├── scripts/
│   ├── seed_users.py     # Create test users
│   └── ingest.py         # Document ingestion script
├── components/           # React components
│   ├── Chat.tsx
│   ├── UserSelector.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── SourcePanel.tsx
├── index.ts              # Bun server
├── index.html            # HTML entry
├── frontend.tsx          # React entry
├── styles.css            # Styles
├── Dockerfile
├── docker-compose.yml
└── environment.yml       # Conda environment
```

## Database Schema

**users**
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Tenant identifier |
| email | string | User email |
| role | string | User role |
| allowedSources | string[] | List of accessible sources |

**documents**
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Tenant identifier |
| sourceKey | string | Source category (e.g., "public", "finance") |
| title | string | Document title |
| rawText | string | Full document text |

**chunks**
| Field | Type | Description |
|-------|------|-------------|
| tenantId | string | Tenant identifier |
| sourceKey | string | Source category |
| docId | id | Reference to parent document |
| chunkIndex | number | Position in document |
| text | string | Chunk content |

## Ingesting Custom Documents

Use the `ingest_doc` function in `scripts/ingest.py`:

```python
from scripts.ingest import ingest_doc

ingest_doc(
    tenant_id="acme",
    source_key="hr",
    title="HR Policy",
    raw_text="Your document content here..."
)
```

Documents are automatically chunked, embedded, and indexed in both Convex and FAISS.

## Security Considerations

- **Tenant Isolation**: All queries are filtered by tenant ID
- **Source-Based ACL**: Users can only search indexes for their allowed sources
- **Defense-in-Depth**: Multiple layers verify access before returning results
- **Header-Based Auth**: User identity passed via `x-user-id` header (suitable for internal/demo use; replace with proper auth for production)

## License

MIT
