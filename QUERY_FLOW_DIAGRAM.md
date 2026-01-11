# User Query Process Flow

```mermaid
flowchart TD
    Start([User Types Message]) --> Frontend[React UI<br/>Chat.tsx sendMessage<br/>POST /api/chat]
    
    Frontend --> BunProxy[Bun Server<br/>Proxy to FastAPI]
    
    BunProxy --> FastAPI[FastAPI /chat endpoint]
    
    FastAPI --> Auth[_require_user<br/>Validate Convex Auth Session<br/>Get tenantId, allowedSources]
    
    Auth --> CheckAccess{Access Control<br/>allowedSources empty?}
    
    CheckAccess -->|Yes| Error[Return Error<br/>No sources available]
    Error --> End([End])
    
    CheckAccess -->|No| Embedding[OpenAI Embeddings<br/>Generate Query Embedding]
    
    Embedding --> FAISS[FAISS Search<br/>Search allowed source indexes<br/>Return top-k chunk IDs]
    
    FAISS --> Retrieve[Convex DB<br/>chunks:getMany<br/>Filter by tenantId]
    
    Retrieve --> Filter[Defense-in-Depth Filter<br/>Verify tenantId & sourceKey<br/>Build context]
    
    Filter --> Chat[OpenAI Chat Completion<br/>Generate Answer]
    
    Chat --> Log[Convex DB logs:add<br/>Store query, answer, sources]
    
    Log --> Response[Return Response<br/>answer + retrieved sources]
    
    Response --> Display[React UI<br/>Display Answer + Sources]
    
    Display --> End
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Auth fill:#fff4e1
    style FAISS fill:#e1ffe1
    style Chat fill:#ffe1f5
    style Filter fill:#ffffcc
    style CheckAccess fill:#f0e1ff
    style Error fill:#ffcccc
```

## Key Access Control Points

1. **Authentication** (`_require_user`): Validates Convex Auth token and retrieves user info
2. **Source Filtering** (`get_allowed_sources`): Admins get all sources, members get their assigned sources
3. **FAISS Index Selection**: Only searches indexes for user's allowed sources
4. **Tenant Filtering**: Convex query filters chunks by tenantId at database level
5. **Defense-in-Depth**: Double-checks tenantId and sourceKey before building context

## Components Involved

- **Frontend**: React UI (Chat.tsx) - User interface
- **Bun Server**: Proxy layer forwarding requests
- **FastAPI**: Main API handling chat queries
- **Convex**: Database and authentication
- **FAISS**: Vector similarity search
- **OpenAI**: Embeddings and chat completion
