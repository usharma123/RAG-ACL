# RAG-ACL

A multi-tenant Retrieval-Augmented Generation (RAG) system with role-based access control. Users can only query documents from sources they are authorized to access.

## Overview

RAG-ACL combines vector similarity search with strict access control to ensure users only receive answers derived from documents they have permission to view. The system uses:

- **FAISS** for fast vector similarity search (per-tenant, per-source indexes)
- **Convex** for database storage (users, documents, chunks) and authentication
- **OpenAI/OpenRouter** for embeddings and chat completions
- **FastAPI** for the backend API
- **React + Bun** for the frontend
- **@convex-dev/auth** for authentication
- **Sample data + scripts** for generating and ingesting multi-source documents

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React UI      │────▶│   Bun Server    │────▶│   FastAPI       │
│   (Port 3000)   │     │   (Proxy/API)   │     │   (Port 8000)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
                                     ┌────────────────────┼────────────────────┐
                                     │                    │                    │
                                     ▼                    ▼                    ▼
                              ┌──────────┐         ┌──────────┐         ┌──────────┐
                              │  FAISS   │         │  Convex  │         │  OpenAI  │
                              │  Index   │         │    DB    │         │          │
                              └──────────┘         │  + Auth  │         └──────────┘
                                                   └──────────┘
```

- **Bun Server**: Serves the React frontend, proxies API requests to FastAPI, and handles Convex client connections
- **FastAPI**: Handles chat queries, retrieves from FAISS, and enforces access control
- **Convex**: Stores users, documents, chunks, and handles authentication via @convex-dev/auth

## Access Control Model

Each user has:
- A `tenantId` for multi-tenant isolation
- An `allowedSources` list (e.g., `["gdrive", "confluence", "slack"]`)

When a user sends a query:
1. The system retrieves only from FAISS indexes matching their allowed sources
2. Chunks are filtered by tenant ID at the database level
3. A defense-in-depth check validates source access before returning results

### Query Flow

```
┌─────────────┐
│   User      │
│  (React UI) │
└──────┬──────┘
       │ 1. Types message
       ▼
┌─────────────────────────────────────┐
│  Chat.tsx sendMessage()             │
│  - POST /api/chat                   │
│  - Headers: Authorization token     │
└──────┬──────────────────────────────┘
       │ 2. Request with auth token
       ▼
┌─────────────────────────────────────┐
│  Bun Server (Proxy)                 │
│  index.ts                           │
│  - Forwards to FastAPI              │
└──────┬──────────────────────────────┘
       │ 3. Proxy to FastAPI
       ▼
┌─────────────────────────────────────┐
│  FastAPI /chat endpoint             │
│  api/main.py:170                    │
└──────┬──────────────────────────────┘
       │ 4. Extract auth token
       ▼
┌─────────────────────────────────────┐
│  _require_user()                    │
│  - Validate Convex Auth session     │
│  - Get tenantId, allowedSources.    |
└──────┬──────────────────────────────┘
       │ 5. Return user object
       ▼
┌─────────────────────────────────────┐
│  Access Control Check               │
│  - Get allowed sources for user     │
│  - If empty: return error           │
└──────┬──────────────────────────────┘
       │ 6. User query + allowed sources
       ▼
┌─────────────────────────────────────┐
│  OpenAI Embeddings                  │
│  - Generate embedding for query     │
└──────┬──────────────────────────────┘
       │ 7. Query vector
       ▼
┌─────────────────────────────────────┐
│  FAISS Search                       │
│  faiss_store.search()               │
│  - Search per-tenant, per-source    │
│    indexes (only allowed sources)   │
│  - Return top-k chunk IDs + scores  │
└──────┬──────────────────────────────┘
       │ 8. Chunk IDs
       ▼
┌─────────────────────────────────────┐
│  Convex DB: chunks:getMany          │
│  - Retrieve chunks by IDs           │
│  - Filter by tenantId (server-side) │
└──────┬──────────────────────────────┘
       │ 9. Chunks (with metadata)
       ▼
┌─────────────────────────────────────-┐
│  Defense-in-Depth Filter             │
│  - Verify tenantId matches user      │
│  - Verify sourceKey in allowedSources│
│  - Build context -> filtered chunks  │
└──────┬────────────────────────────── |
       │ 10. Context + question
       ▼
┌─────────────────────────────────────┐
│  OpenAI Chat Completion             │
│  - Generate answer from context     │
└──────┬──────────────────────────────┘
       │ 11. AI answer
       ▼
┌─────────────────────────────────────┐
│  Fetch Documents                    │
│  - Get document titles/URLs         │
│  - Build retrieved response list    │
└──────┬──────────────────────────────┘
       │ 12. Log query in Convex
       ▼
┌─────────────────────────────────────┐
│  Convex DB: logs:add                │
│  - Store query, answer, sources     │
└──────┬──────────────────────────────┘
       │ 13. Return response
       ▼
┌─────────────────────────────────────┐
│  Response to Frontend               │
│  {                                  │
│    answer,                          │
│    retrieved: [source hits],        │
│    logId                            │
│  }                                  │
└──────┬──────────────────────────────┘
       │ 14. Display answer + sources
       ▼
┌─────────────┐
│   User      │
│  (React UI) │
└─────────────┘
```

**Key Access Control Points:**

1. **Authentication** (main.py:77-100): Validates Convex Auth token
2. **FAISS Index Selection** (main.py:194): Only searches indexes for user's allowed sources
3. **Tenant Filtering** (main.py:197): Convex query filters by tenantId
4. **Defense-in-Depth** (main.py:203): Double-checks tenantId and sourceKey before using context

Example:
- **Alice** has access to `["gdrive", "confluence", "slack"]` - can query all documents
- **Bob** has access to `["gdrive"]` - cannot see confluence or slack documents

## Prerequisites

- Docker and Docker Compose
- Bun (https://bun.sh)
- A Convex account (https://convex.dev)
- An OpenAI API key or OpenRouter API key
- Python 3.11+ (optional if running scripts locally; Docker image includes dependencies)

## Authentication

RAG-ACL uses **@convex-dev/auth** for authentication with a password-based provider.

### How Auth Works

1. Users sign up/in via the React UI using email and password
2. Convex Auth manages sessions with secure cookies
3. The API validates sessions via the `Authorization` header or cookies
4. User roles and allowed sources are stored in the `users` table

### Default Roles

| Role | Description |
|------|-------------|
| `member` | Default role, has access based on allowedSources |
| `admin` | Full access, can manage other users |
| `engineer` | Role-based suggestions for engineering |
| `finance` | Role-based suggestions for finance |
| `hr` | Role-based suggestions for HR |

### Default Sources

| Source Key | Description |
|------------|-------------|
| `gdrive` | Google Drive documents |
| `confluence` | Confluence pages |
| `slack` | Slack export files |
| `notion` | Notion documents |
| `public` | Public/internal documents |
| `finance` | Finance-specific documents |
| `engineering` | Engineering-specific documents |
| `hr` | HR-specific documents |

### First-Time Setup

1. Sign up with any email and password
2. Click "Become Admin" to become the first admin user
3. Use the Admin panel to assign roles and sources to other users

### Admin Features

Admins can:
- View all users in their tenant
- Update user roles
- Modify allowed sources for any user
- Assign source access permissions

## Setup

### 1. Clone and Install Dependencies

```bash
cd rag-faiss-convex
bun install
```

### 2. Configure Environment

Create a `.env` file with:

```env
CONVEX_DEPLOYMENT=dev:your-deployment-name
CONVEX_URL=https://your-deployment.convex.cloud

OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://openrouter.ai/api/v1  # Optional: for OpenRouter

EMBED_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini

ALLOW_HEADER_AUTH=false  # Set to true for development header-based auth
```

### 3. Start Convex

```bash
bun run convex:dev
```

### 4. Build and Run Docker Services

```bash
docker compose up --build
```

This starts:
- **Frontend** on port 3000
- **API** on port 8000

### 5. Seed Users (Optional)

For programmatic user creation:

```bash
docker compose exec api python -m scripts.seed_users
```

### 6. Seed Sample Data

Minimal two-source demo (public and finance):

```bash
docker compose exec api python -m scripts.ingest
```

Multi-source sample data (gdrive, confluence, slack):

```bash
docker compose exec api python -m scripts.generate_sample_docs
docker compose exec api python -m scripts.ingest_folder
```

### 7. Start the Frontend (Alternative)

For local development without Docker:

```bash
bun run dev
```

The application will be available at http://localhost:3000

## Usage

### Web Interface

Open http://localhost:3000 in your browser:

1. **Sign Up**: Create an account with email and password
2. **Become Admin**: First user should click "Become Admin"
3. **Configure Users**: Use the Admin panel to assign roles and sources
4. **Chat**: Ask questions about documents you have access to

### API Authentication

API endpoints require authentication via Convex Auth session.

**Get current user:**

```bash
curl http://localhost:8000/me \
  -H "Authorization: Bearer <token>"
```

**Send a chat message:**

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "What are the office hours?"}'
```

Response:
```json
{
  "answer": "The office hours are 9-5.",
  "retrieved": [
    {"sourceKey": "gdrive", "score": 0.71, "docTitle": "Hiring Plan", "snippet": "..."},
    {"sourceKey": "confluence", "score": 0.15, "docTitle": "Onboarding", "snippet": "..."}
  ],
  "logId": "abc123"
}
```

### Development Header Auth

For testing, set `ALLOW_HEADER_AUTH=true` in `.env` and use the `x-user-id` header:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-id>" \
  -d '{"message": "What are the office hours?"}'
```

## Project Structure

```
rag-faiss-convex/
├── api/
│   ├── main.py           # FastAPI application with auth, chat, feedback endpoints
│   └── faiss_store.py    # FAISS vector store management (per-tenant, per-source)
├── convex/
│   ├── schema.ts         # Database schema (users, documents, chunks, logs)
│   ├── auth.ts           # Convex Auth configuration (password provider)
│   ├── users.ts          # User queries/mutations (CRUD, admin functions)
│   ├── chunks.ts         # Chunk retrieval with tenant filtering
│   ├── documents.ts      # Document queries
│   ├── ingest.ts         # Document ingestion mutations
│   └── logs.ts           # Query logging and feedback
├── scripts/
│   ├── seed_users.py     # Create test users via API
│   ├── ingest.py         # Simple document ingestion script
│   ├── ingest_folder.py  # Ingest all files under data/<source>/
│   ├── generate_sample_docs.py # Generate sample docs under data/
│   └── test_acl.py       # ACL validation script
├── components/           # React components
│   ├── Chat.tsx          # Main chat interface, auth state handling
│   ├── SignIn.tsx        # Email/password sign-in/sign-up form
│   ├── UserSelector.tsx  # User panel showing current user info
│   ├── MessageList.tsx   # Chat messages with feedback buttons
│   ├── MessageInput.tsx  # Text input for chat messages
│   ├── SourcePanel.tsx   # Sidebar showing retrieved sources
│   ├── SourceViewer.tsx  # Modal to view source document content
│   └── AdminPanel.tsx    # User management (admin only)
├── data/                 # Sample docs by source
│   ├── gdrive/           # Google Drive documents
│   ├── confluence/       # Confluence pages
│   └── slack/            # Slack export files
├── faiss_data/           # Generated FAISS indexes (per-tenant, per-source)
├── index.ts              # Bun server (frontend + API proxy)
├── index.html            # HTML entry point
├── frontend.tsx          # React entry with Convex Auth provider
├── styles.css            # Complete styling
├── Dockerfile            # API container definition
├── Dockerfile.frontend   # Frontend container definition
├── docker-compose.yml    # Multi-container configuration
└── environment.yml       # Conda environment for Python dependencies
```

## Database Schema

### users
| Field | Type | Description |
|-------|------|-------------|
| _id | id | User identifier |
| tenantId | string | Tenant identifier |
| email | string | User email |
| role | string | User role (member, admin, engineer, finance, hr) |
| allowedSources | string[] | List of accessible source keys |

### documents
| Field | Type | Description |
|-------|------|-------------|
| _id | id | Document identifier |
| tenantId | string | Tenant identifier |
| sourceKey | string | Source category (e.g., "gdrive", "confluence") |
| title | string | Document title |
| rawText | string | Full document text |
| sourceUrl | string | Optional URL to original source |

### chunks
| Field | Type | Description |
|-------|------|-------------|
| _id | id | Chunk identifier |
| tenantId | string | Tenant identifier |
| sourceKey | string | Source category |
| docId | id | Reference to parent document |
| chunkIndex | number | Position in document |
| text | string | Chunk content |

### queryLogs
| Field | Type | Description |
|-------|------|-------------|
| _id | id | Log identifier |
| tenantId | string | Tenant identifier |
| userId | id | User who made the query |
| message | string | User's question |
| answer | string | AI response |
| allowedSources | string[] | User's allowed sources at query time |
| retrieved | object[] | Retrieved chunks with scores |
| createdAt | number | Timestamp |

### feedback
| Field | Type | Description |
|-------|------|-------------|
| _id | id | Feedback identifier |
| logId | id | Reference to query log |
| userId | id | User who gave feedback |
| helpful | boolean | Thumbs up/down |
| comment | string | Optional feedback comment |
| createdAt | number | Timestamp |

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

To ingest a folder of documents, place files under `rag-faiss-convex/data/<sourceKey>/` and run:

```bash
docker compose exec api python -m scripts.ingest_folder
```

Supported file types include `.md`, `.txt`, and Slack-style `.json` exports. Slack exports should follow the format generated by `scripts/generate_sample_docs.py`.

## ACL Test Script

Run the ACL test suite after ingesting data:

```bash
docker compose exec api python -m scripts.test_acl
```

This script validates that:
- Users can only retrieve documents from their allowed sources
- Cross-tenant isolation is enforced
- Source filtering works correctly

## Security Considerations

- **Tenant Isolation**: All queries are filtered by tenant ID
- **Source-Based ACL**: Users can only search indexes for their allowed sources
- **Defense-in-Depth**: Multiple layers verify access before returning results
- **Session-Based Auth**: Convex Auth uses secure cookies for session management
- **Password Hashing**: Handled securely by @convex-dev/auth

### Authorization Flow

1. User authenticates via Convex Auth (email/password)
2. API validates session token from cookie or Authorization header
3. User's tenantId and allowedSources are retrieved from Convex
4. Only FAISS indexes matching allowedSources are searched
5. Results are filtered by tenant ID and source at multiple layers
6. Chunks from unauthorized sources are excluded before generating response

### Production Readiness

Before production deployment:

1. **OAuth Configuration**: Add OAuth provider config:
   ```env
   OAUTH_CLIENT_ID=your-client-id
   OAUTH_CLIENT_SECRET=your-client-secret
   OAUTH_METADATA_URL=https://your-idp.com/.well-known/openid-configuration
   OAUTH_REDIRECT_URL=https://your-domain.com/api/auth/callback
   SESSION_SECRET=your-session-secret
   ```

2. **Group-Based Access**: Configure automatic role/source assignment:
   ```env
   AUTH_GROUP_SOURCE_MAP={"Domain Users":["public"],"Engineering":["engineering","gdrive"]}
   AUTH_GROUP_ROLE_MAP={"Engineering":"engineer","Finance":"finance"}
   AUTH_DEFAULT_TENANT=your-tenant
   AUTH_DEFAULT_SOURCES=["public"]
   ```

3. **Production Auth**: Run `bun run convex:dev` to push schema, then deploy with OAuth

## License

MIT
