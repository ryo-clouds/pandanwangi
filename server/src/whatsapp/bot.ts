import { Client, LocalAuth, RemoteAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { askQuestionWhatsApp } from '../rag/chain';
import { createSession, saveMessage } from '../lib/database';
import path from 'path';

// Session mapping: phoneNumber -> sessionId
const userSessions = new Map<string, string>();

// Whitelist nomor HP (opsional, kosongkan untuk allow all)
const ALLOWED_NUMBERS = process.env.WHATSAPP_ALLOWED_NUMBERS?.split(',') || [];

// Chrome path: use env variable (for Render/Docker) or local path (for dev)
const getChromePath = (): string | undefined => {
    // Check environment variable first (for Docker/Render)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    // Local dev path (Mac)
    const localPath = path.resolve(__dirname, '../../node_modules/.puppeteer/chrome/mac_arm-144.0.7559.96/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    try {
        require('fs').accessSync(localPath);
        return localPath;
    } catch {
        return undefined; // Let Puppeteer find Chrome automatically
    }
};

export class WhatsAppBot {
    private client: Client;
    private isReady = false;

    constructor() {
        const chromePath = getChromePath();
        console.log(`🌐 Chrome path: ${chromePath || 'auto-detect'}`);
        
        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: './data/whatsapp_auth'
            }),
            puppeteer: {
                headless: true,
                executablePath: chromePath,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    // Memory optimization flags
                    '--single-process',
                    '--disable-extensions',
                    '--disable-software-rasterizer',
                    '--disable-features=site-per-process',
                    '--js-flags=--max-old-space-size=256'
                ]
            },
            // Use remote web version cache for compatibility
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/AhsanAyaz/whatsapp-web.js/main/src/util/Misc.js',
            }
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        // QR Code untuk autentikasi
        this.client.on('qr', (qr) => {
            console.log('\n📱 WHATSAPP BOT - Scan QR Code berikut dengan HP Anda:\n');
            qrcode.generate(qr, { small: true });
            console.log('\n');
        });

        // Client ready
        this.client.on('ready', () => {
            this.isReady = true;
            console.log('✅ WhatsApp Bot is ready!');
        });

        // Handle incoming messages
        this.client.on('message_create', async (message) => {
            try {
                // Skip jika pesan dari bot sendiri
                if (message.fromMe) return;

                // Extract nomor HP pengirim
                const phoneNumber = message.from.split('@')[0];

                // Whitelist check (jika ada)
                if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(phoneNumber)) {
                    console.log(`⚠️  Blocked message from unauthorized number: ${phoneNumber}`);
                    return;
                }

                // Skip pesan kosong atau media tanpa caption
                if (!message.body || message.body.trim() === '') return;

                console.log(`📩 [${phoneNumber}]: ${message.body}`);

                // Get or create session untuk user ini
                let sessionId: string = userSessions.get(phoneNumber) || '';
                if (!sessionId) {
                    const session = await createSession(`WA: ${phoneNumber}`);
                    sessionId = session.id;
                    userSessions.set(phoneNumber, sessionId);
                }

                // Save user message
                await saveMessage({
                    session_id: sessionId,
                    role: 'user',
                    content: message.body
                });

                // Get chat object
                const chat = await message.getChat();
                
                // Kirim "typing..." indicator
                await chat.sendStateTyping();

                // Generate AI response (WhatsApp-friendly formatting)
                const { answer, sources } = await askQuestionWhatsApp(message.body, sessionId);

                // Save AI message
                await saveMessage({
                    session_id: sessionId,
                    role: 'assistant',
                    content: answer,
                    sources: sources
                });

                // Reply ke user menggunakan chat.sendMessage (bypass sendSeen issue)
                await chat.sendMessage(answer);

                console.log(`✅ Replied to ${phoneNumber}`);

            } catch (error: any) {
                console.error('❌ Error handling WhatsApp message:', error);
                if (this.isReady) {
                    try {
                        const chat = await message.getChat();
                        await chat.sendMessage('Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.');
                    } catch (replyError) {
                        console.error('Failed to send error message:', replyError);
                    }
                }
            }
        });

        // Handle disconnection - prevent crash
        this.client.on('disconnected', (reason) => {
            console.log('⚠️  WhatsApp Bot disconnected:', reason);
            this.isReady = false;
            console.log('ℹ️  Session ended. Please restart server and scan QR code again.');
        });

        // Handle authentication failure
        this.client.on('auth_failure', (msg) => {
            console.error('❌ WhatsApp authentication failed:', msg);
            this.isReady = false;
        });
        
        // Handle change_state to track connection
        this.client.on('change_state', (state) => {
            console.log('📊 WhatsApp state changed:', state);
        });
    }

    public async initialize() {
        try {
            console.log('🚀 Initializing WhatsApp Bot...');
            await this.client.initialize();
        } catch (error) {
            console.error('❌ Failed to initialize WhatsApp Bot:', error);
            throw error;
        }
    }

    public async destroy() {
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            console.log('🛑 WhatsApp Bot stopped');
        }
    }

    public getStatus() {
        return {
            isReady: this.isReady,
            activeSessions: userSessions.size
        };
    }
}
