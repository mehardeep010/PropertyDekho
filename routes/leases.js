const router = require('express').Router();
const db = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t ON tl.Tenant_ID = t.Tenant_ID
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT l.*, p.Title AS Property_Title
      FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      WHERE l.Lease_ID=?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KYA KAR RAHA HAI: Naya lease banata hai.
// KAISE KAR RAHA HAI: Ye khud lock nahi lagata. Ye SQL Stored Procedure 'CreateLeaseTx' ko call karta hai.
// SQL engine strict ACID compliance follow karke row ko lock karta hai.
router.post('/', async (req, res) => {
  const { Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, Tenant_ID } = req.body;
  
  try {
    await db.query(`CALL CreateLeaseTx(?, ?, ?, ?, ?, ?, @statusCode, @msg, @newLeaseId)`, 
      [Start_Date, End_Date, Monthly_Rent, Security_Deposit || 0, Property_ID, Tenant_ID || null]
    );

    const [[result]] = await db.query(`SELECT @statusCode AS status, @msg AS message, @newLeaseId AS leaseId`);

    // Agar dusre agent ne property already le li, toh 409 bhejega (Conflict)
    if (result.status === 409) {
        return res.status(409).json({ error: result.message });
    } else if (result.status === 500) {
        return res.status(500).json({ error: result.message });
    }

    res.status(201).json({ Lease_ID: result.leaseId, message: result.message });
    
  } catch (e) { 
    res.status(500).json({ error: 'System error calling procedure: ' + e.message }); 
  }
});

router.put('/:id', async (req, res) => {
  const { Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID } = req.body;
  try {
    await db.query(
      'UPDATE LEASE SET Start_Date=?,End_Date=?,Monthly_Rent=?,Security_Deposit=?,Property_ID=? WHERE Lease_ID=?',
      [Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { 
      await db.query('DELETE FROM LEASE WHERE Lease_ID=?', [req.params.id]); 
      res.json({ message: 'Deleted' }); 
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;