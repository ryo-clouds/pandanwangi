"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveDocuments = exports.toggleDocumentStatus = exports.deleteDocument = exports.getDocuments = exports.saveDocument = exports.getMemories = exports.saveMemory = exports.clearMessages = exports.getAllMessages = exports.getRecentMessages = exports.getSessionMessages = exports.saveMessage = exports.getSessions = exports.createSession = void 0;
const supabase_1 = require("../lib/supabase");
// ============ CHAT SESSIONS ============
const createSession = async (title = 'New Chat') => {
    const { data, error } = await supabase_1.supabase
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
exports.createSession = createSession;
const getSessions = async () => {
    const { data, error } = await supabase_1.supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching sessions:", error);
        return [];
    }
    return data || [];
};
exports.getSessions = getSessions;
// ============ CHAT MESSAGES ============
const saveMessage = async (msg) => {
    const { data, error } = await supabase_1.supabase
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
exports.saveMessage = saveMessage;
const getSessionMessages = async (sessionId) => {
    const { data, error } = await supabase_1.supabase
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
exports.getSessionMessages = getSessionMessages;
const getRecentMessages = async (limit = 10) => {
    // Deprecated or used for global context? 
    // For now, return empty or implement if needed.
    return [];
};
exports.getRecentMessages = getRecentMessages;
const getAllMessages = async () => {
    // Deprecated in favor of getSessionMessages
    return [];
};
exports.getAllMessages = getAllMessages;
const clearMessages = async () => {
    // Maybe clear sessions?
    // For safety, let's keep it but ideally we delete sessions
};
exports.clearMessages = clearMessages;
// ============ MEMORIES (Long-term facts) ============
const saveMemory = async (fact, sourceMessageId) => {
    const { data, error } = await supabase_1.supabase
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
exports.saveMemory = saveMemory;
const getMemories = async (limit = 20) => {
    const { data, error } = await supabase_1.supabase
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
exports.getMemories = getMemories;
// ============ DOCUMENTS ============
const saveDocument = async (filename, storagePath, chunks, pages) => {
    const { data, error } = await supabase_1.supabase
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
exports.saveDocument = saveDocument;
const getDocuments = async () => {
    const { data, error } = await supabase_1.supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching documents:", error);
        return [];
    }
    return data || [];
};
exports.getDocuments = getDocuments;
const deleteDocument = async (id, storagePath) => {
    // 1. Delete from DB
    const { error } = await supabase_1.supabase
        .from('documents')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    // 2. Delete from Storage (Optional - requires permissions)
    // await supabase.storage.from('pdfs').remove([storagePath]);
};
exports.deleteDocument = deleteDocument;
const toggleDocumentStatus = async (id, isActive) => {
    const { data, error } = await supabase_1.supabase
        .from('documents')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.toggleDocumentStatus = toggleDocumentStatus;
const getActiveDocuments = async () => {
    // Returns list of STORAGE PATHS or SOURCE URLs of active docs
    const { data, error } = await supabase_1.supabase
        .from('documents')
        .select('storage_path, filename')
        .eq('is_active', true);
    if (error)
        return [];
    // We map to what is stored in vector metadata. 
    // Usually 'source' in metadata is the public URL or sometimes filename?
    // In loader.ts: metadata.source = publicUrl (which comes from storagePath)
    // We might need to match partially or strict. 
    // For now let's just use filenames or storage paths.
    return data.map(d => d.filename);
};
exports.getActiveDocuments = getActiveDocuments;
