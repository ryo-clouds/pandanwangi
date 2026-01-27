-- Migration: Restore Legacy History
-- This script moves all "orphaned" messages (messages created before the Session feature)
-- into a new session called "Riwayat Arsip".

DO $$
DECLARE
    legacy_session_id UUID;
BEGIN
    -- Check if there are any orphaned messages (session_id is NULL)
    IF EXISTS (SELECT 1 FROM public.chat_messages WHERE session_id IS NULL) THEN
        
        -- 1. Create a new session for them
        INSERT INTO public.chat_sessions (title)
        VALUES ('Riwayat Arsip')
        RETURNING id INTO legacy_session_id;

        -- 2. Update the orphaned messages to belong to this new session
        UPDATE public.chat_messages
        SET session_id = legacy_session_id
        WHERE session_id IS NULL;
        
        RAISE NOTICE 'Legacy messages migrated to session: %', legacy_session_id;
    
    ELSE
        RAISE NOTICE 'No orphaned messages found. Migration skipped.';
    END IF;
END $$;
