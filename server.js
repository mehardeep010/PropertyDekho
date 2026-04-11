const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const { verifyToken, requireRole } = require('./middleware/auth');
const app = express();

// KYA KAR RAHA HAI: Frontend se aane wale data ko backend me read karne layak banata hai.
app.use(cors());
app.use(express.json());

const db = require('./db/connection');

// KYA KAR RAHA HAI: Background worker jo purane unpaid records delete karta hai.
// KAISE KAR RAHA HAI:Har 5 min me ye DB check karta hai. 
// Agar lease bane 2 ghante ho gaye aur payment nahi aayi, toh ye usko expire kar deta hai 
// aur property wapas Available kar deta hai.
async function runAutoExpiry() {
  try {
    const [expiredLeases] = await db.query(`
      SELECT l.Lease_ID, l.Property_ID FROM LEASE l
      WHERE l.Lease_Status = 'Pending_Payment'
        AND l.Created_At < DATE_SUB(NOW(), INTERVAL 2 HOUR)`);
    
    for (const lease of expiredLeases) {
      await db.query("UPDATE LEASE SET Lease_Status='Expired' WHERE Lease_ID=?", [lease.Lease_ID]);
      await db.query('DELETE FROM TENANT_LEASE WHERE Lease_ID=?', [lease.Lease_ID]);
      await db.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [lease.Property_ID]);
      console.log(`[Auto-Expiry] Cleaned up Lease #${lease.Lease_ID}`);
    }

    try {
        const [expiredSales] = await db.query(`
          SELECT s.Sale_ID, s.Property_ID FROM SALE s
          WHERE s.Sale_Status = 'Pending_Payment'
            AND s.Created_At < DATE_SUB(NOW(), INTERVAL 3 HOUR)`);
            
        for (const sale of expiredSales) {
          await db.query("UPDATE SALE SET Sale_Status='Cancelled' WHERE Sale_ID=?", [sale.Sale_ID]);
          await db.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=? AND Status != 'Sold'", [sale.Property_ID]);
        }
    } catch (err) {}
  } catch (e) { 
      console.error('[Auto-Expiry Error]:', e.message); 
  }
}

runAutoExpiry();
setInterval(runAutoExpiry, 5 * 60 * 1000);


app.use(express.static(path.join(__dirname, 'public')));

// KYA KAR RAHA HAI: Saare endpoints ko unki files me bhej raha hai (Routing).
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties',  require('./routes/properties'));
app.use('/api/amenities',   require('./routes/amenities'));

app.use('/api/agents',    verifyToken, require('./routes/agents'));
app.use('/api/owners',    verifyToken, require('./routes/owners'));
app.use('/api/tenants',   verifyToken, require('./routes/tenants'));
app.use('/api/inquiries', verifyToken, require('./routes/inquiries'));
app.use('/api/leases',    verifyToken, require('./routes/leases'));
app.use('/api/payments',  verifyToken, require('./routes/payments'));
app.use('/api/dashboard', verifyToken, require('./routes/dashboard'));
app.use('/api/profile',   verifyToken, require('./routes/profile'));

app.use('/api/tenant-portal', verifyToken, requireRole('tenant'), require('./routes/tenantPortal'));
app.use('/api/owner-portal',  verifyToken, requireRole('owner'),  require('./routes/ownerPortal'));
app.use('/api/agent-portal',  verifyToken, requireRole('agent'),  require('./routes/agentPortal'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nPROPERTY DEKHO - SYSTEM RUNNING ON PORT ${PORT}\n`);
  console.log(`Website Live at: http://localhost:${PORT}\n`);
  
});