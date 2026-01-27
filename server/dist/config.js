"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3000,
    hfToken: process.env.HF_TOKEN,
    modelRepo: "openai/gpt-oss-20b",
    vectorStorePath: "./data/vector_store",
    uploadPath: "./uploads",
    // Supabase
    supabaseUrl: process.env.SUPABASE_PROJECT_URL || '',
    supabaseServiceKey: process.env.SERVICE_ROLE_KEY || '',
    supabaseAnonKey: process.env.ANON_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'knowledge-bucket'
};
if (!exports.config.hfToken) {
    console.warn("WARNING: HF_TOKEN is not set in .env");
}
if (!exports.config.supabaseUrl || !exports.config.supabaseServiceKey) {
    console.warn("WARNING: Supabase credentials not fully configured in .env");
}
