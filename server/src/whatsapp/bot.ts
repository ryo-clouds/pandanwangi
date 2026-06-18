import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState,
    WASocket,
    proto
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { askQuestionWhatsApp } from '../rag/chain';
import { createSession, saveMessage } from '../lib/database';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Session mapping: phoneNumber -> sessionId
const userSessions = new Map<string, string>();

// Rate limiter map: phoneNumber -> { count: number, timestamp: number }
const rateLimiter = new Map<string, { count: number, timestamp: number }>();
const MAX_MESSAGES_PER_MINUTE = 5;

// Whitelist nomor HP (opsional, kosongkan untuk allow all)
const ALLOWED_NUMBERS = process.env.WHATSAPP_ALLOWED_NUMBERS?.split(',') || [];

// Auth folder
const AUTH_FOLDER = path.resolve(__dirname, '../../data/whatsapp_auth');

export class WhatsAppBot {
    private sock: WASocket | null = null;
    private isReady = false;

    constructor() {
        // Ensure auth folder exists
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
    }

    public async initialize() {
        try {
            console.log('🚀 Initializing WhatsApp Bot (Baileys)...');
            
            const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
            
            this.sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
                browser: ['Cianjur AI Agent', 'Chrome', '120.0.0']
            });

            // Handle connection updates
            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                if (qr) {
                    console.log('\n📱 WHATSAPP BOT - Scan QR Code berikut dengan HP Anda:\n');
                    qrcode.generate(qr, { small: true });
                    console.log('\n');
                }
                
                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('⚠️  Connection closed, reconnecting:', shouldReconnect);
                    this.isReady = false;
                    
                    if (shouldReconnect) {
                        await this.initialize();
                    }
                } else if (connection === 'open') {
                    this.isReady = true;
                    console.log('✅ WhatsApp Bot is ready!');
                }
            });

            // Save credentials when updated
            this.sock.ev.on('creds.update', saveCreds);

            // Handle incoming messages
            this.sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                
                // Skip if no message or if from self
                if (!msg.message || msg.key.fromMe) return;
                
                // Skip status updates
                if (msg.key.remoteJid === 'status@broadcast') return;
                
                // Get message text
                const messageText = 
                    msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    '';
                
                if (!messageText.trim()) return;
                
                const phoneNumber = msg.key.remoteJid?.split('@')[0] || '';
                
                // Whitelist check
                if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(phoneNumber)) {
                    console.log(`⚠️  Blocked message from unauthorized number: ${phoneNumber}`);
                    return;
                }
                
                // Rate Limiter Check
                const now = Date.now();
                const userLimit = rateLimiter.get(phoneNumber) || { count: 0, timestamp: now };

                // Reset count if more than 1 minute has passed
                if (now - userLimit.timestamp > 60000) {
                    userLimit.count = 0;
                    userLimit.timestamp = now;
                }

                userLimit.count += 1;
                rateLimiter.set(phoneNumber, userLimit);

                if (userLimit.count > MAX_MESSAGES_PER_MINUTE) {
                    console.log(`⚠️  Rate limit exceeded for number: ${phoneNumber}`);
                    if (userLimit.count === MAX_MESSAGES_PER_MINUTE + 1) {
                        try {
                            await this.sock?.sendMessage(msg.key.remoteJid!, { 
                                text: '⚠️ Terlalu banyak pesan. Mohon tunggu 1 menit sebelum mengirim pesan lagi.' 
                            });
                        } catch (e) {}
                    }
                    return;
                }
                
                console.log(`📩 [${phoneNumber}]: ${messageText}`);
                
                try {
                    // Get or create session
                    let sessionId = userSessions.get(phoneNumber);
                    if (!sessionId) {
                        // Use first message as session title (truncated)
                        const sessionTitle = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
                        const session = await createSession(sessionTitle);
                        sessionId = session.id as string;
                        userSessions.set(phoneNumber, sessionId);
                    }
                    
                    // Save user message
                    await saveMessage({
                        session_id: sessionId,
                        role: 'user',
                        content: messageText,
                        sources: []
                    });
                    
                    // Send typing indicator
                    await this.sock?.sendPresenceUpdate('composing', msg.key.remoteJid!);
                    
                    // Generate AI response (WhatsApp-friendly formatting)
                    const { answer, sources } = await askQuestionWhatsApp(messageText, sessionId);
                    
                    // Save AI message
                    await saveMessage({
                        session_id: sessionId,
                        role: 'assistant',
                        content: answer,
                        sources: sources
                    });
                    
                    // Reply to user
                    await this.sock?.sendMessage(msg.key.remoteJid!, { text: answer });
                    console.log(`✅ Replied to ${phoneNumber}`);
                    
                } catch (error) {
                    console.error('❌ Error handling WhatsApp message:', error);
                    try {
                        await this.sock?.sendMessage(msg.key.remoteJid!, { 
                            text: 'Maaf, terjadi kesalahan. Coba lagi ya! 🙏' 
                        });
                    } catch (replyError) {
                        console.error('Failed to send error message:', replyError);
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize WhatsApp Bot:', error);
            throw error;
        }
    }

    public async destroy() {
        try {
            if (this.sock) {
                this.sock.end(undefined);
                this.isReady = false;
                console.log('🛑 WhatsApp Bot stopped');
            }
        } catch (error) {
            console.error('Error destroying WhatsApp client:', error);
            this.isReady = false;
        }
    }

    public getStatus() {
        return {
            isReady: this.isReady,
            activeSessions: userSessions.size
        };
    }
}
