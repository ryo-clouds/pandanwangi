-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  content text,
  metadata jsonb,
  embedding vector(1024) -- multilingual-e5-large has 1024 dimensions
);

-- Create a function to search for documents
create or replace function match_documents (
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  and document_chunks.metadata @> filter
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an HNSW index for faster search
create index on document_chunks using hnsw (embedding vector_cosine_ops);
