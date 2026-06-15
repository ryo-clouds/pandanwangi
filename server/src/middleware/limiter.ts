import rateLimit from 'express-rate-limit';

// General API Limiter (Basic DDoS protection)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased: 500 requests per windowMs for development
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});

// Chat Limiter (More strict to prevent LLM abuse)
export const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, // Increased: 100 chat messages per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Chat limit exceeded. Please wait a moment." }
});

// Auth Limiter (Brute force protection)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes (reduced from 1 hour)
    max: 20, // 20 login attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." }
});
