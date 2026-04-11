// Owner-specific data endpoints
const router = require('express').Router();
const db = require('../db/connection');

// Dashboard
router.get('/dashboard', async (req, res) => {
  const oid = req.user.ref_id;
  try {
    const [[{ my_properties }]]   = await db.query('SELECT COUNT(*) AS my_properties FROM PROPERTY WHERE Owner_ID=?', [oid]);
    const [[{ active_leases }]]   = await db.query("SELECT COUNT(*) AS active_leases FROM LEASE l JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND l.End_Date>=CURDATE()", [oid]);
    const [[{ open_inquiries }]]  = await db.query("SELECT COUNT(*) AS open_inquiries FROM INQUIRY i JOIN PROPERTY p ON i.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND i.Status IN ('New','Responded')", [oid]);
    const [[{ total_revenue }]]   = await db.query("SELECT IFNULL(SUM(pay.Amount),0) AS total_revenue FROM PAYMENT pay JOIN LEASE l ON pay.Lease_ID=l.Lease_ID JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND pay.Status='Success'", [oid]);
    // Status breakdown
    const [statusBreakdown] = await db.query('SELECT Status, COUNT(*) AS count FROM PROPERTY WHERE Owner_ID=? GROUP BY Status', [oid]);
    res.json({ my_properties, active_leases, open_inquiries, total_revenue, statusBreakdown });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My properties
router.get('/properties', async (req, res) => {
  const oid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT p.*, a.Name AS Agent_Name, a.Phone AS Agent_Phone,
             (SELECT COUNT(*) FROM INQUIRY i WHERE i.Property_ID=p.Property_ID) AS inquiry_count
      FROM PROPERTY p
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      WHERE p.Owner_ID = ?
      ORDER BY p.Property_ID DESC`, [oid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Inquiries on my properties
router.get('/inquiries', async (req, res) => {
  const oid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT i.*, p.Title AS Property_Title, t.Name AS Tenant_Name, t.Phone AS Tenant_Phone,
             a.Name AS Agent_Name
      FROM INQUIRY i
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN TENANT t   ON i.Tenant_ID   = t.Tenant_ID
      JOIN AGENT a    ON i.Agent_ID    = a.Agent_ID
      WHERE p.Owner_ID = ?
      ORDER BY i.Date DESC`, [oid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Leases on my properties
router.get('/leases', async (req, res) => {
  const oid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p      ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`, [oid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Payments for my properties
router.get('/payments', async (req, res) => {
  const oid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT pay.*, p.Title AS Property_Title
      FROM PAYMENT pay
      JOIN LEASE l    ON pay.Lease_ID   = l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID  = p.Property_ID
      WHERE p.Owner_ID = ?
      ORDER BY pay.Payment_Date DESC`, [oid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
