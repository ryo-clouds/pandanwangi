-- CAG (Cache Augmented Generation) Tables
-- Run this SQL in your Supabase SQL Editor

-- ============ Document Summaries (Layer 1: Preprocessing Cache) ============
CREATE TABLE IF NOT EXISTS document_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    summary TEXT NOT NULL,
    key_topics TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doc_summaries_doc_id ON document_summaries(document_id);

-- ============ Response Cache (Layer 3: Full Response Cache) ============
CREATE TABLE IF NOT EXISTS response_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query_hash TEXT UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_response_cache_hash ON response_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON response_cache(expires_at);

-- ============ Enable RLS (Row Level Security) ============
-- Allow service role full access
ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_cache ENABLE ROW LEVEL SECURITY;

-- Policy: service_role can do everything
CREATE POLICY "Service role full access to document_summaries" ON document_summaries
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to response_cache" ON response_cache
    FOR ALL USING (true) WITH CHECK (true);
