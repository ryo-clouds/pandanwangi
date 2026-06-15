-- Migration: Add is_active column to documents table
-- Run this in Supabase SQL Editor

-- Add the is_active column with default value true
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Set all existing documents to active
UPDATE documents SET is_active = true WHERE is_active IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON documents(is_active);
