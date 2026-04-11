// Agent-specific data endpoints
const router = require('express').Router();
const db = require('../db/connection');

// Dashboard
router.get('/dashboard', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [[{ my_properties }]]  = await db.query('SELECT COUNT(*) AS my_properties FROM PROPERTY WHERE Agent_ID=?', [aid]);
    const [[{ new_inquiries }]]  = await db.query("SELECT COUNT(*) AS new_inquiries FROM INQUIRY WHERE Agent_ID=? AND Status='New'", [aid]);
    const [[{ active_leases }]]  = await db.query("SELECT COUNT(*) AS active_leases FROM LEASE l JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Agent_ID=? AND l.End_Date>=CURDATE()", [aid]);
    const [[{ pending_payments }]]= await db.query("SELECT COUNT(*) AS pending_payments FROM PAYMENT pay JOIN LEASE l ON pay.Lease_ID=l.Lease_ID JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Agent_ID=? AND pay.Status='Pending'", [aid]);
    const [[{ commission_earned }]]= await db.query(`
      SELECT IFNULL(SUM(pay.Amount * a.Commission_Rate / 100),0) AS commission_earned
      FROM PAYMENT pay
      JOIN LEASE l ON pay.Lease_ID=l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID=p.Property_ID
      JOIN AGENT a ON p.Agent_ID=a.Agent_ID
      WHERE p.Agent_ID=? AND pay.Status='Success'`, [aid]);
    res.json({ my_properties, new_inquiries, active_leases, pending_payments, commission_earned });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My assigned properties
router.get('/properties', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT p.*, o.Name AS Owner_Name, o.Phone AS Owner_Phone,
             (SELECT COUNT(*) FROM INQUIRY i WHERE i.Property_ID=p.Property_ID) AS inquiry_count,
             (SELECT GROUP_CONCAT(am.Amenity_Name SEPARATOR ', ') FROM PROPERTY_AMENITY pa JOIN AMENITY am ON pa.Amenity_ID=am.Amenity_ID WHERE pa.Property_ID=p.Property_ID) AS Amenities
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      WHERE p.Agent_ID = ?
      ORDER BY p.Property_ID DESC`, [aid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Inquiries for agent
router.get('/inquiries', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT i.*, p.Title AS Property_Title, p.Location, p.Price,
             t.Tenant_ID, t.Name AS Tenant_Name, t.Phone AS Tenant_Phone, t.Email AS Tenant_Email
      FROM INQUIRY i
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN TENANT t   ON i.Tenant_ID   = t.Tenant_ID
      WHERE i.Agent_ID = ?
      ORDER BY FIELD(i.Status,'New','Responded','Closed'), i.Date DESC`, [aid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update inquiry status
router.put('/inquiries/:id', async (req, res) => {
  const { Status } = req.body;
  const aid = req.user.ref_id;
  try {
    await db.query('UPDATE INQUIRY SET Status=? WHERE Inquiry_ID=? AND Agent_ID=?', [Status, req.params.id, aid]);
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create lease — status starts as Pending_Payment
// Property stays current status until tenant pays security deposit
router.post('/leases', async (req, res) => {
  const { Property_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO LEASE (Start_Date,End_Date,Monthly_Rent,Security_Deposit,Property_ID,Lease_Status) VALUES(?,?,?,?,?,?)',
      [Start_Date, End_Date, Monthly_Rent, Security_Deposit || 0, Property_ID, 'Pending_Payment']
    );
    const leaseId = r.insertId;
    await conn.query('INSERT INTO TENANT_LEASE (Tenant_ID,Lease_ID) VALUES(?,?)', [Tenant_ID, leaseId]);
    // Mark property as Pending — will become Rented after security deposit is paid
    await conn.query("UPDATE PROPERTY SET Status='Pending' WHERE Property_ID=?", [Property_ID]);
    await conn.commit();
    res.status(201).json({ Lease_ID: leaseId, message: 'Lease created. Tenant must pay security deposit within 2 hours.' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// Terminate lease — agent can evict tenant & free property at any time
router.post('/leases/:id/terminate', async (req, res) => {
  const aid  = req.user.ref_id;
  const conn = await db.getConnection();
  try {
    // Verify this lease belongs to an agent-assigned property
    const [[lease]] = await conn.query(`
      SELECT l.Lease_ID, l.Property_ID FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      WHERE l.Lease_ID = ? AND p.Agent_ID = ?`, [req.params.id, aid]);
    if (!lease) return res.status(403).json({ error: 'Lease not found or not assigned to you' });

    await conn.beginTransaction();
    // Set lease to Terminated
    await conn.query("UPDATE LEASE SET Lease_Status='Terminated' WHERE Lease_ID=?", [lease.Lease_ID]);
    // Remove tenant link
    await conn.query('DELETE FROM TENANT_LEASE WHERE Lease_ID=?', [lease.Lease_ID]);
    // Set property back to Available ONLY if it hasn't been sold
    const [[prop]] = await conn.query('SELECT Status FROM PROPERTY WHERE Property_ID=?', [lease.Property_ID]);
    if (prop && prop.Status !== 'Sold') {
      await conn.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [lease.Property_ID]);
    }
    await conn.commit();
    const msg = prop?.Status === 'Sold'
      ? 'Lease terminated. Property remains Sold (irreversible).'
      : 'Lease terminated. Property is now Available.';
    res.json({ message: msg });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});


// Leases for agent
router.get('/leases', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p      ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`, [aid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Payments for agent
router.get('/payments', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT pay.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM PAYMENT pay
      JOIN LEASE l    ON pay.Lease_ID = l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      GROUP BY pay.Payment_ID
      ORDER BY pay.Payment_Date DESC`, [aid]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SALE ENDPOINTS ───────────────────────────────────────────
// Create a property sale (buyer has 3 hrs to pay)
router.post('/sales', async (req, res) => {
  const { Property_ID, Buyer_Tenant_ID, Amount } = req.body;
  const aid  = req.user.ref_id;
  const conn = await db.getConnection();
  try {
    // Verify this property is assigned to the agent and is not Sold
    const [[prop]] = await conn.query(
      'SELECT Property_ID, Status FROM PROPERTY WHERE Property_ID=? AND Agent_ID=?', [Property_ID, aid]);
    if (!prop)    return res.status(403).json({ error: 'Property not found or not assigned to you' });
    if (prop.Status === 'Sold') return res.status(400).json({ error: 'Property is already sold.' });
    if (prop.Status === 'Rented') return res.status(400).json({ error: 'Property is currently rented. Terminate the lease first.' });

    await conn.beginTransaction();
    const [r] = await conn.query(
      "INSERT INTO SALE (Property_ID, Buyer_Tenant_ID, Amount, Sale_Status) VALUES(?,?,?,'Pending_Payment')",
      [Property_ID, Buyer_Tenant_ID, Amount]
    );
    // Mark property as Pending (will become Sold after payment)
    await conn.query("UPDATE PROPERTY SET Status='Pending' WHERE Property_ID=?", [Property_ID]);
    await conn.commit();
    res.status(201).json({ Sale_ID: r.insertId, message: 'Sale created! Buyer has 3 hours to complete payment.' });
  } catch (e) { await conn.rollback(); res.status(500).json({ error: e.message }); }
  finally { conn.release(); }
});

// List sales for agent's properties
router.get('/sales', async (req, res) => {
  const aid = req.user.ref_id;
  try {
    const [rows] = await db.query(`
      SELECT s.*, p.Title AS Property_Title, p.Location, p.Status AS Property_Status,
             t.Name AS Buyer_Name, t.Phone AS Buyer_Phone, t.Email AS Buyer_Email,
             TIMESTAMPDIFF(SECOND, s.Created_At, NOW()) AS seconds_elapsed
      FROM SALE s
      JOIN PROPERTY p ON s.Property_ID     = p.Property_ID
      JOIN TENANT   t ON s.Buyer_Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      ORDER BY s.Created_At DESC`, [aid]);
    rows.forEach(r => {
      r.time_remaining_seconds = r.Sale_Status === 'Pending_Payment'
        ? Math.max(0, 10800 - (r.seconds_elapsed || 0))  // 3 hrs = 10800s
        : null;
    });
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

