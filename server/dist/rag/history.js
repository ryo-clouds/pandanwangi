"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearHistory = exports.saveMessage = exports.getHistory = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const HISTORY_FILE = path_1.default.join(__dirname, '../../data/chat_history.json');
// Ensure data dir exists
const ensureDir = () => {
    const dir = path_1.default.dirname(HISTORY_FILE);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
};
const getHistory = () => {
    ensureDir();
    if (!fs_1.default.existsSync(HISTORY_FILE))
        return [];
    try {
        const data = fs_1.default.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch (e) {
        console.error("Failed to read history:", e);
        return [];
    }
};
exports.getHistory = getHistory;
const saveMessage = (msg) => {
    ensureDir();
    const history = (0, exports.getHistory)();
    history.push(msg);
    // Keep last 50 messages
    if (history.length > 50) {
        history.shift();
    }
    fs_1.default.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
};
exports.saveMessage = saveMessage;
const clearHistory = () => {
    if (fs_1.default.existsSync(HISTORY_FILE)) {
        fs_1.default.unlinkSync(HISTORY_FILE);
    }
};
exports.clearHistory = clearHistory;
