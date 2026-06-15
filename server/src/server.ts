import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { config } from './config';
import { processPdf, triggerSummaryGeneration } from './rag/loader';
import { askQuestion, askQuestionStream } from './rag/chain';
import { getCacheStats, contextCache, clearResponseCache } from './rag/cache';
import { deleteDocumentSummary, generateDocumentSummary } from './rag/summarizer';
import fs from 'fs';
import { 
    saveMessage, 
    getSessionMessages,
    createSession,
    getSessions,
    clearMessages,
    getDocuments,
    saveDocument,
    deleteDocument,
    toggleDocumentStatus,
    deleteSession,
    flushVectorStore,
} from './lib/database';
import { 
    getAnalyticsStats, 
    getTopQuestions, 
    getDailyActivity, 
    getRecentQuestions 
} from './lib/analytics';
import { uploadToStorage, getPublicUrl } from './lib/supabase';
import { authenticateToken, generateToken } from './middleware/auth';
import { apiLimiter, authLimiter, chatLimiter } from './middleware/limiter';
import { WhatsAppBot } from './whatsapp';

const app = express();

// Enable CORS for Client
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT']
}));

app.use(express.json());

// Apply general limiter to all api routes
app.use('/api/', apiLimiter as any);

// Configure Multer for Memory Storage (Direct Upload)
const upload = multer({ storage: multer.memoryStorage() });

// Routes
app.get('/health', (req, res) => res.send('OK'));

// ============ AUTHENTICATION ============

app.post('/api/login', authLimiter as any, (req: any, res: any) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    
    if (password === adminPassword) {
        const token = generateToken({ role: 'admin' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// ============ SESSION MANAGEMENT ============

app.post('/api/sessions', async (req, res) => {
    try {
        const title = req.body.title || 'New Chat';
        const session = await createSession(title);
        res.json(session);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await getSessions();
        res.json(sessions);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/sessions/:id', async (req, res) => {
    try {
        const messages = await getSessionMessages(req.params.id);
        res.json(messages);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await deleteSession(req.params.id);
        res.json({ message: "Session deleted" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ============ CHAT & DOCUMENTS ============

// Protect History Clearing
app.delete('/api/history', authenticateToken, async (req, res) => {
    try {
        await clearMessages();
        res.json({ message: "History cleared" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const docs = await getDocuments();
        res.json(docs);
    } catch (e) {
        res.json([]);
    }
});

// Document Management APIs
app.delete('/api/documents/:id', authenticateToken, async (req, res): Promise<any> => {
    try {
        const { id } = req.params;
        // Ideally we get storagePath first to delete from storage too
        // For now just DB delete
        await deleteDocument(id as string, "");
        res.json({ message: "Document deleted" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.patch('/api/documents/:id/toggle', authenticateToken, async (req, res): Promise<any> => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await toggleDocumentStatus(id as string, isActive);
        res.json({ message: `Document ${isActive ? 'enabled' : 'disabled'}` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Flush all vector chunks
app.delete('/api/vectors/flush', authenticateToken, async (req, res): Promise<any> => {
    try {
        const result = await flushVectorStore();
        // Also clear CAG caches when vectors are flushed
        contextCache.clear();
        await clearResponseCache();
        res.json({ message: `Flushed ${result.deleted} vector chunks + CAG caches`, deleted: result.deleted });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ============ CAG CACHE ENDPOINTS ============

// Get cache statistics
app.get('/api/cache/stats', authenticateToken, async (req, res): Promise<any> => {
    try {
        const stats = await getCacheStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Flush all caches
app.delete('/api/cache/flush', authenticateToken, async (req, res): Promise<any> => {
    try {
        const contextCleared = contextCache.clear();
        const responseCleared = await clearResponseCache();
        res.json({ 
            message: 'All CAG caches flushed',
            contextCacheCleared: contextCleared,
            responseCacheCleared: responseCleared
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Re-generate document summary
app.post('/api/documents/:id/resummarize', authenticateToken, async (req, res): Promise<any> => {
    try {
        const { id } = req.params;
        const docs = await getDocuments();
        const doc = docs.find((d: any) => d.id === id);
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Fetch document chunks to get text
        const { supabase } = await import('./lib/supabase');
        const { data: chunks } = await supabase
            .from('document_chunks')
            .select('content')
            .contains('metadata', { source: doc.storage_path || doc.filename });

        const fullText = chunks?.map((c: any) => c.content).join('\n') || doc.filename;
        const result = await generateDocumentSummary(id as string, fullText, doc.filename);
        
        res.json({ message: 'Summary regenerated', ...result });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Re-index Document (Fix 0-chunk issues)
app.post('/api/documents/:id/reindex', authenticateToken, async (req, res): Promise<any> => {
    try {
        const { id } = req.params;
        
        // 1. Get Document Info from DB
        const docs = await getDocuments();
        const doc = docs.find((d: any) => d.id === id);
        
        if (!doc) return res.status(404).json({ error: "Document not found" });
        if (!doc.storage_path) return res.status(400).json({ error: "Document has no storage path" });

        console.log(`Re-indexing document: ${doc.filename} (${doc.storage_path})`);

        // 2. Download from Supabase
        const { downloadFromStorage } = await import('./lib/supabase');
        let fileBuffer: Buffer;
        try {
            fileBuffer = await downloadFromStorage(doc.storage_path);
        } catch (downloadError: any) {
             console.error("Failed to download file for re-indexing:", downloadError);
             return res.status(500).json({ error: "Failed to retrieve file from storage" });
        }

        // 3. Process PDF (Re-run extraction with forceOCR)
        // We use the existing storage path as sourceUrl for consistency, or generate a public one
        const { getPublicUrl } = await import('./lib/supabase');
        const publicUrl = getPublicUrl(doc.storage_path);
        
        // Pass forceOCR: true to always attempt OCR during re-index
        const result = await processPdf(fileBuffer, publicUrl, doc.filename, true);

        // 4. Update Database Metadata
        // We need a specific updates function or just overwrite via saveDocument (if upsert works on unique path/filename?)
        // saveDocument usually INSERTS. modification needed?
        // Let's use specific update query via supabase client in 'lib/database' or quick fix:
        const { supabase } = await import('./lib/supabase');
        
        await supabase
            .from('documents')
            .update({
                chunks_count: result.chunks,
                pages_count: result.pages
            })
            .eq('id', id);

        return res.json({ 
            message: "Document re-indexed successfully", 
            stats: result 
        });

    } catch (e: any) {
        console.error("Re-index error:", e);
        res.status(500).json({ error: e.message });
    }
});

// Protect Uploads
app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res): Promise<any> => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    try {
        console.log("File received (Buffer):", req.file.originalname);
        const storagePath = `pdfs/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        
        // 1. Upload to Supabase Storage FIRST (Direct Buffer)
        let publicUrl = '';
        try {
            await uploadToStorage(storagePath, req.file.buffer);
            console.log("File uploaded to Supabase Storage:", storagePath);
            
            // Get Public URL
            publicUrl = getPublicUrl(storagePath);
            console.log("File Public URL:", publicUrl);
        } catch (supabaseError: any) {
            console.error("Supabase upload failed:", supabaseError);
            return res.status(500).json({ error: "Supabase Storage Upload Failed. Strict mode requires Supabase storage." });
        }
        
        // 2. Process PDF for RAG using the verified Supabase URL as source
        // Pass Buffer directly to loader, avoiding local file save
        console.log("Indexing PDF from Buffer with source:", publicUrl);
        const result = await processPdf(req.file.buffer, publicUrl, req.file.originalname);
        
        // 3. Save document metadata to database
        let savedDocId: string | undefined;
        try {
            const saved = await saveDocument(
                req.file.originalname,
                storagePath,
                result.chunks,
                result.pages
            );
            savedDocId = saved?.id;
        } catch (dbError) {
             console.warn("Saving to database failed, but indexing succeeded:", dbError);
        }
        
        // 4. CAG: Trigger summary generation asynchronously (non-blocking)
        if (savedDocId && result.success) {
            // Get document text for summary (use first chunks)
            const { supabase } = await import('./lib/supabase');
            const { data: chunks } = await supabase
                .from('document_chunks')
                .select('content')
                .contains('metadata', { source: publicUrl })
                .limit(10);
            
            const sampleText = chunks?.map((c: any) => c.content).join('\n') || req.file.originalname;
            triggerSummaryGeneration(savedDocId, sampleText, req.file.originalname).catch(() => {});
        }

        return res.json({ 
            message: "File ingested successfully (Direct Upload)", 
            filename: req.file.originalname,
            stats: result,
            url: publicUrl,
            cag: savedDocId ? 'summary_generating' : 'skipped'
        });
    } catch (e: any) {
        console.error("Upload error:", e);
        return res.status(500).json({ error: e.message || "Internal Server Error" });
    }
});

// Atomic Chat Endpoint (No Streaming)
app.post('/api/chat', chatLimiter as any, async (req, res): Promise<any> => {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    console.log(`[POST /api/chat] Received message: "${message.substring(0, 50)}..." (Session: ${sessionId})`);

    try {
        // 1. Create/Get Session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
             const session = await createSession(message.slice(0, 30));
             currentSessionId = session.id;
        }

        // 2. Save User Message
        await saveMessage({
            session_id: currentSessionId,
            role: 'user',
            content: message
        });
        
        // 3. Generate Answer (Atomic)
        console.log(`[POST /api/chat] Generating answer...`);
        const { answer, sources } = await askQuestion(message, currentSessionId);
        
        // 4. Save AI Message
        await saveMessage({
            session_id: currentSessionId,
            role: 'assistant',
            content: answer,
            sources: sources
        });
        
        // 5. Send Response
        console.log(`[POST /api/chat] Sending response (Length: ${answer.length})`);
        res.json({ 
            content: answer, 
            sources: sources,
            sessionId: currentSessionId 
        });
        
    } catch (error: any) {
        console.error("❌ [POST /api/chat] FAILING ERROR:", error);
        console.error("Stack Trace:", error.stack);
        res.status(500).json({ 
            error: error.message || "Internal Server Error",
            details: error.stack ? error.stack.split('\n')[0] : 'No stack trace'
        });
    }
});


// ============ ANALYTICS (Admin Only) ============

app.get('/api/analytics/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await getAnalyticsStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/analytics/top-questions', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const questions = await getTopQuestions(limit);
        res.json(questions);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/analytics/daily-activity', authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 7;
        const activity = await getDailyActivity(days);
        res.json(activity);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/analytics/recent-questions', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const questions = await getRecentQuestions(limit);
        res.json(questions);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


app.listen(config.port, () => {
    console.log(`AI Agent Server running at http://localhost:${config.port}`);
});

// Initialize WhatsApp Bot (if enabled)
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
let whatsappBot: WhatsAppBot | null = null;

if (WHATSAPP_ENABLED) {
    whatsappBot = new WhatsAppBot();
    whatsappBot.initialize().catch((error) => {
        console.error('Failed to start WhatsApp Bot:', error);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down gracefully...');
        if (whatsappBot) {
            await whatsappBot.destroy();
        }
        process.exit(0);
    });

    // WhatsApp status endpoint
    app.get('/api/whatsapp/status', authenticateToken, (req, res) => {
        if (!whatsappBot) {
            return res.json({ enabled: false });
        }
        res.json({ enabled: true, ...whatsappBot.getStatus() });
    });
} else {
    console.log('ℹ️  WhatsApp Bot is disabled. Set WHATSAPP_ENABLED=true to enable.');
}

