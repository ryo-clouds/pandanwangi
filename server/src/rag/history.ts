import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(__dirname, '../../data/chat_history.json');

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: any[];
    timestamp: number;
}

// Ensure data dir exists
const ensureDir = () => {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

export const getHistory = (): ChatMessage[] => {
    ensureDir();
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to read history:", e);
        return [];
    }
};

export const saveMessage = (msg: ChatMessage) => {
    ensureDir();
    const history = getHistory();
    history.push(msg);
    // Keep last 50 messages
    if (history.length > 50) {
        history.shift();
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
};

export const clearHistory = () => {
    if (fs.existsSync(HISTORY_FILE)) {
        fs.unlinkSync(HISTORY_FILE);
    }
};
