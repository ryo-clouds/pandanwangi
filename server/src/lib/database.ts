import { supabase } from '../lib/supabase';

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
}

export interface ChatMessage {
    id?: string;
    session_id?: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any;
    created_at?: string;
}

export interface Memory {
    id?: string;
    fact: string;
    source_message_id?: string;
    created_at?: string;
}

// ============ CHAT SESSIONS ============

export const createSession = async (title: string = 'New Chat') => {
    const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ title })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating session:", error);
        throw error;
    }
    return data;
};

export const getSessions = async (): Promise<ChatSession[]> => {
    const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching sessions:", error);
        return [];
    }
    return data || [];
};

export const deleteSession = async (sessionId: string) => {
    // 1. Delete messages first (if not cascade)
    const { error: msgError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

    if (msgError) {
        console.error("Error deleting session messages:", msgError);
        throw msgError;
    }

    // 2. Delete session
    const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
    
    if (error) {
        console.error("Error deleting session:", error);
        throw error;
    }
};

// ============ CHAT MESSAGES ============

export const saveMessage = async (msg: Omit<ChatMessage, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            session_id: msg.session_id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error saving message:", error);
        throw error;
    }
    return data;
};

export const getSessionMessages = async (sessionId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error("Error fetching messages:", error);
        return [];
    }
    
    return data || [];
};

export const getRecentMessages = async (limit: number = 10): Promise<ChatMessage[]> => {
    // Deprecated or used for global context? 
    // For now, return empty or implement if needed.
    return []; 
};

export const getAllMessages = async (): Promise<ChatMessage[]> => {
    // Deprecated in favor of getSessionMessages
    return [];
};

export const clearMessages = async () => {
   // Maybe clear sessions?
   // For safety, let's keep it but ideally we delete sessions
};

// ============ MEMORIES (Long-term facts) ============

export const saveMemory = async (fact: string, sourceMessageId?: string) => {
    const { data, error } = await supabase
        .from('memories')
        .insert({
            fact,
            source_message_id: sourceMessageId
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error saving memory:", error);
        throw error;
    }
    return data;
};

export const getMemories = async (limit: number = 20): Promise<Memory[]> => {
    const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error("Error fetching memories:", error);
        return [];
    }
    
    return data || [];
};

// ============ DOCUMENTS ============

export const saveDocument = async (filename: string, storagePath: string, chunks: number, pages: number) => {
    const { data, error } = await supabase
        .from('documents')
        .insert({
            filename,
            storage_path: storagePath,
            chunks_count: chunks,
            pages_count: pages
        })
        .select()
        .single();
    
    if (error) {
        console.error("Error saving document:", error);
        throw error;
    }
    return data;
};

export const getDocuments = async () => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching documents:", error);
        return [];
    }
    
    return data || [];
};

export const deleteDocument = async (id: string, storagePath: string) => {
    // 1. First get the document to find its source URL
    const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('source_url, filename')
        .eq('id', id)
        .single();
    
    if (fetchError) {
        console.error("Error fetching document for deletion:", fetchError);
    }
    
    // 2. Delete vector chunks that match this document's source
    if (doc?.source_url) {
        console.log(`🗑️ Deleting vector chunks for source: ${doc.source_url}`);
        
        // Delete chunks where metadata->source matches
        const { error: chunksError, count } = await supabase
            .from('document_chunks')
            .delete({ count: 'exact' })
            .eq('metadata->>source', doc.source_url);
        
        if (chunksError) {
            console.error("Error deleting vector chunks:", chunksError);
        } else {
            console.log(`✅ Deleted ${count || 0} vector chunks`);
        }
    }
    
    // 3. Delete from documents table
    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    
    console.log(`✅ Document ${doc?.filename || id} deleted successfully`);

    // 4. Delete from Storage (Optional - requires permissions)
    // await supabase.storage.from('pdfs').remove([storagePath]);
};

export const toggleDocumentStatus = async (id: string, isActive: boolean) => {
    console.log(`Toggling document ${id} to ${isActive}`);
    
    const { data, error } = await supabase
        .from('documents')
        .update({ is_active: isActive })
        .eq('id', id)
        .select();
    
    if (error) {
        console.error('Toggle document error:', error);
        throw error;
    }
    
    if (!data || data.length === 0) {
        throw new Error(`Document with id ${id} not found`);
    }
    
    console.log('Toggle success:', data[0]);
    return data[0];
};

export const getActiveDocuments = async (): Promise<string[]> => {
    // Returns list of STORAGE PATHS or SOURCE URLs of active docs
    const { data, error } = await supabase
        .from('documents')
        .select('storage_path, filename')
        .eq('is_active', true);
        
    if (error) return [];
    // We map to what is stored in vector metadata. 
    // Usually 'source' in metadata is the public URL or sometimes filename?
    // In loader.ts: metadata.source = publicUrl (which comes from storagePath)
    // We might need to match partially or strict. 
    // For now let's just use filenames or storage paths.
    return data.map(d => d.filename); 
};

// Flush all vector chunks from document_chunks table
export const flushVectorStore = async () => {
    console.log('🗑️ Flushing all vector chunks...');
    
    // Get count first
    const { count: totalCount } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });
    
    // Delete all chunks - Supabase requires a filter, so we use a trick
    // Delete where id is not null (which is all rows)
    const { error, count } = await supabase
        .from('document_chunks')
        .delete({ count: 'exact' })
        .not('id', 'is', null);
    
    if (error) {
        console.error('Error flushing vector store:', error);
        throw error;
    }
    
    console.log(`✅ Flushed ${count || totalCount || 0} vector chunks`);
    return { deleted: count || totalCount || 0 };
};
