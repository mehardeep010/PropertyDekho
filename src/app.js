// KYA KAR RAHA HAI: Express app ko assemble karta hai (middlewares + routes + error handler).
// KAISE KAR RAHA HAI: Yahan sirf app banta hai, listen NAHI hota. Listen server.js me hota hai.
// Isse testing aasaan ho jaati hai — test me bina port khole app ko supertest se hit kar sakte hain.
const express = require('express');
const cors = require('cors');
const path = require('path');

const { verifyToken, requireRole } = require('./api/middlewares/auth');
const errorHandler = require('./api/middlewares/errorHandler');

const app = express();

// Core middlewares: CORS + JSON body parsing.
app.use(cors());
app.use(express.json());

// Static frontend (public/ folder root se serve hota hai).
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── PUBLIC API ROUTES (token ki zaroorat nahi) ──
app.use('/api/auth', require('./api/routes/auth.routes'));
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
