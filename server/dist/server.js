"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const config_1 = require("./config");
const loader_1 = require("./rag/loader");
const chain_1 = require("./rag/chain");
const database_1 = require("./lib/database");
const supabase_1 = require("./lib/supabase");
const auth_1 = require("./middleware/auth");
const limiter_1 = require("./middleware/limiter");
const app = (0, express_1.default)();
// Enable CORS for Client
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE']
}));
app.use(express_1.default.json());
// Apply general limiter to all api routes
app.use('/api/', limiter_1.apiLimiter);
// Configure Multer for Memory Storage (Direct Upload)
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Routes
app.get('/health', (req, res) => res.send('OK'));
// ============ AUTHENTICATION ============
app.post('/api/login', limiter_1.authLimiter, (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    if (password === adminPassword) {
        const token = (0, auth_1.generateToken)({ role: 'admin' });
        res.json({ token });
    }
    else {
        res.status(401).json({ error: 'Invalid password' });
    }
});
// ============ SESSION MANAGEMENT ============
app.post('/api/sessions', async (req, res) => {
    try {
        const title = req.body.title || 'New Chat';
        const session = await (0, database_1.createSession)(title);
        res.json(session);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await (0, database_1.getSessions)();
        res.json(sessions);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/sessions/:id', async (req, res) => {
    try {
        const messages = await (0, database_1.getSessionMessages)(req.params.id);
        res.json(messages);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// ============ CHAT & DOCUMENTS ============
// Protect History Clearing
app.delete('/api/history', auth_1.authenticateToken, async (req, res) => {
    try {
        await (0, database_1.clearMessages)();
        res.json({ message: "History cleared" });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/documents', auth_1.authenticateToken, async (req, res) => {
    try {
        const docs = await (0, database_1.getDocuments)();
        res.json(docs);
    }
    catch (e) {
        res.json([]);
    }
});
// Document Management APIs
app.delete('/api/documents/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Ideally we get storagePath first to delete from storage too
        // For now just DB delete
        await (0, database_1.deleteDocument)(id, "");
        res.json({ message: "Document deleted" });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.patch('/api/documents/:id/toggle', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await (0, database_1.toggleDocumentStatus)(id, isActive);
        res.json({ message: `Document ${isActive ? 'enabled' : 'disabled'}` });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Protect Uploads
app.post('/api/upload', auth_1.authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });
    try {
        console.log("File received (Buffer):", req.file.originalname);
        const storagePath = `pdfs/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        // 1. Upload to Supabase Storage FIRST (Direct Buffer)
        let publicUrl = '';
        try {
            await (0, supabase_1.uploadToStorage)(storagePath, req.file.buffer);
            console.log("File uploaded to Supabase Storage:", storagePath);
            // Get Public URL
            publicUrl = (0, supabase_1.getPublicUrl)(storagePath);
            console.log("File Public URL:", publicUrl);
        }
        catch (supabaseError) {
            console.error("Supabase upload failed:", supabaseError);
            return res.status(500).json({ error: "Supabase Storage Upload Failed. Strict mode requires Supabase storage." });
        }
        // 2. Process PDF for RAG using the verified Supabase URL as source
        // Pass Buffer directly to loader, avoiding local file save
        console.log("Indexing PDF from Buffer with source:", publicUrl);
        const result = await (0, loader_1.processPdf)(req.file.buffer, publicUrl, req.file.originalname);
        // 3. Save document metadata to database
        try {
            await (0, database_1.saveDocument)(req.file.originalname, storagePath, result.chunks, result.pages);
        }
        catch (dbError) {
            console.warn("Saving to database failed, but indexing succeeded:", dbError);
        }
        return res.json({
            message: "File ingested successfully (Direct Upload)",
            filename: req.file.originalname,
            stats: result,
            url: publicUrl
        });
    }
    catch (e) {
        console.error("Upload error:", e);
        return res.status(500).json({ error: e.message || "Internal Server Error" });
    }
});
// Atomic Chat Endpoint (No Streaming)
app.post('/api/chat', limiter_1.chatLimiter, async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message)
        return res.status(400).json({ error: "Message is required" });
    try {
        // 1. Create/Get Session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const session = await (0, database_1.createSession)(message.slice(0, 30));
            currentSessionId = session.id;
        }
        // 2. Save User Message
        await (0, database_1.saveMessage)({
            session_id: currentSessionId,
            role: 'user',
            content: message
        });
        // 3. Generate Answer (Atomic)
        const { answer, sources } = await (0, chain_1.askQuestion)(message, currentSessionId);
        // 4. Save AI Message
        await (0, database_1.saveMessage)({
            session_id: currentSessionId,
            role: 'assistant',
            content: answer,
            sources: sources
        });
        // 5. Send Response
        res.json({
            content: answer,
            sources: sources,
            sessionId: currentSessionId
        });
    }
    catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});
app.listen(config_1.config.port, () => {
    console.log(`AI Agent Server running at http://localhost:${config_1.config.port}`);
});
