// KYA KAR RAHA HAI: Express app ko assemble karta hai (middlewares + routes + error handler).
// KAISE KAR RAHA HAI: Yahan sirf app banta hai, listen NAHI hota. Listen server.js me hota hai.
// Isse testing aasaan ho jaati hai — test me bina port khole app ko supertest se hit kar sakte hain.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { verifyToken, requireRole } = require('./api/middlewares/auth');
const { authLimiter, apiLimiter } = require('./api/middlewares/rateLimiter');
const httpLogger = require('./api/middlewares/httpLogger');
const errorHandler = require('./api/middlewares/errorHandler');
const pool = require('./db/pool');

const app = express();

// KYA KAR RAHA HAI: Sabse pehle request logging — har request ko id ke saath trace karta hai.
app.use(httpLogger);

// KYA KAR RAHA HAI: Security headers lagata hai (XSS, clickjacking etc. se bachav).
// contentSecurityPolicy off rakha hai kyunki static demo frontend inline scripts/styles use
// karta hai — baaki saare protective headers chalu rehte hain.
app.use(helmet({ contentSecurityPolicy: false }));

// Core middlewares: CORS + JSON body parsing (10kb limit taaki bada payload DoS na ho).
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Static frontend (public/ folder root se serve hota hai).
app.use(express.static(path.join(__dirname, '..', 'public')));

// KYA KAR RAHA HAI: Health check — Docker/deploy platform isse poochhta hai "app zinda hai?".
// DB ko bhi ping karta hai (SELECT 1). DB down -> 503 taaki orchestrator ko sahi signal mile.
// Rate limit se PEHLE rakha hai taaki frequent healthchecks limiter na trigger karein.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up', uptime: Math.round(process.uptime()) });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});

// Saare /api routes pe general rate limit (abuse rokne ke liye).
app.use('/api', apiLimiter);

// ── PUBLIC API ROUTES (token ki zaroorat nahi) ──
// Auth pe extra sakht limiter (brute-force/password-guessing rokne ke liye).
app.use('/api/auth', authLimiter, require('./api/routes/auth.routes'));
app.use('/api/properties', require('./api/routes/property.routes'));
app.use('/api/amenities', require('./api/routes/amenity.routes'));

// ── PROTECTED API ROUTES (valid JWT chahiye) ──
app.use('/api/agents', verifyToken, require('./api/routes/agent.routes'));
app.use('/api/owners', verifyToken, require('./api/routes/owner.routes'));
app.use('/api/tenants', verifyToken, require('./api/routes/tenant.routes'));
app.use('/api/inquiries', verifyToken, require('./api/routes/inquiry.routes'));
app.use('/api/leases', verifyToken, require('./api/routes/lease.routes'));
app.use('/api/payments', verifyToken, require('./api/routes/payment.routes'));
app.use('/api/dashboard', verifyToken, require('./api/routes/dashboard.routes'));
app.use('/api/profile', verifyToken, require('./api/routes/profile.routes'));

// ── ROLE-SCOPED PORTAL ROUTES (sahi role hona zaroori) ──
app.use('/api/tenant-portal', verifyToken, requireRole('tenant'), require('./api/routes/tenantPortal.routes'));
app.use('/api/owner-portal', verifyToken, requireRole('owner'), require('./api/routes/ownerPortal.routes'));
app.use('/api/agent-portal', verifyToken, requireRole('agent'), require('./api/routes/agentPortal.routes'));

// SPA fallback: baaki sab requests pe index.html bhejo (frontend routing).
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Central error handler — SABSE LAST me lagta hai (saari errors yahin aati hain).
app.use(errorHandler);

module.exports = app;
