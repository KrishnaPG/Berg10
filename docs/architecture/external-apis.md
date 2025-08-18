# External APIs

## AI/ML Model Service
- **Purpose:** Generate vector embeddings for Semantic Entity content.
- **Documentation:** Hugging Face Inference API docs, Cloud AI Platform docs.
- **Base URL(s):** `https://api-inference.huggingface.co/`, `https://[region]-aiplatform.googleapis.com/`
- **Authentication:** API Key (Hugging Face), OAuth2 (Cloud)
- **Rate Limits:** Provider-specific.

**Key Endpoints Used:**
- `POST /models/{model_id}` - Generate embeddings for text input.

**Integration Notes:** Use standard client libraries. Handle retries and rate limiting.

## Vector Database (Qdrant/Milvus)
- **Purpose:** Store and query vector embeddings for semantic search.
- **Documentation:** Qdrant API docs, Milvus API docs.
- **Base URL(s):** `http://qdrant:6333`, `http://milvus:19530` (internal service addresses)
- **Authentication:** API Key (if configured)
- **Rate Limits:** Generally high, depends on deployment.

**Key Endpoints Used:**
- `POST /collections/{collection_name}/points` - Upsert vectors and metadata.
- `POST /collections/{collection_name}/points/search` - Perform vector search.

**Integration Notes:** Initialize collections based on `SemanticGroup`. Synchronize index data from `semantic-repo` manifests.
