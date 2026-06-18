import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  hfToken: process.env.HF_TOKEN,
  modelRepo: "openai/gpt-oss-20b",
  vectorStorePath: "./data/vector_store",
  uploadPath: "./uploads",
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_PROJECT_URL || '',
  supabaseServiceKey: process.env.SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.ANON_KEY || '',
  supabaseBucket: process.env.SUPABASE_BUCKET || 'knowledge-bucket',
  
  // Google Cloud Vision OCR
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || ''
};

if (!config.hfToken) {
  console.warn("WARNING: HF_TOKEN is not set in .env");
}

if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.warn("WARNING: Supabase credentials not fully configured in .env");
}
