// KYA KAR RAHA HAI: Brute-force aur abuse rokne ke liye rate limiting.
// KAISE KAR RAHA HAI: Ek IP se thode time me bahut zyada requests aayein toh 429 (Too Many
// Requests) bhej deta hai. Auth pe limit sakht hai (password guessing rokne ke liye).
const rateLimit = require('express-rate-limit');

// Login/register pe sakht limit: 15 min me 20 attempts per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
});

// Baaki API pe general limit: 15 min me 300 requests per IP.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
