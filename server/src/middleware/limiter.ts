import rateLimit from 'express-rate-limit';

// General API Limiter (Basic DDoS protection)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});

// Chat Limiter (More strict to prevent LLM abuse)
// 20 messages per 15 minutes roughly allows continuous chat but stops spam scripts.
export const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Chat limit exceeded. Please wait a moment." }
});

// Auth Limiter (Brute force protection)
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 failed login attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again in an hour." }
});
