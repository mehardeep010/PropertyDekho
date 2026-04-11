const router = require('express').Router();
const db = require('../db/connection');

// GET all with owner and agent names
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, o.Name AS Owner_Name, a.Name AS Agent_Name
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      ORDER BY p.Property_ID
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET by id with amenities
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, o.Name AS Owner_Name, a.Name AS Agent_Name
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      WHERE p.Property_ID = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const [amenities] = await db.query(`
      SELECT am.Amenity_Name FROM AMENITY am
      JOIN PROPERTY_AMENITY pa ON am.Amenity_ID = pa.Amenity_ID
      WHERE pa.Property_ID = ?`, [req.params.id]);
    res.json({ ...rows[0], amenities });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST
router.post('/', async (req, res) => {
  const { Title, Type, Location, Price, Status, Owner_ID, Agent_ID } = req.body;
  // Simulate AI price estimate (±10%)
  const AI_Est_Price = (Price * (0.9 + Math.random() * 0.2)).toFixed(2);
  try {
    const [result] = await db.query(
      'INSERT INTO PROPERTY (Title,Type,Location,Price,Status,AI_Est_Price,Owner_ID,Agent_ID) VALUES(?,?,?,?,?,?,?,?)',
      [Title, Type, Location, Price, Status || 'Available', AI_Est_Price, Owner_ID, Agent_ID]
    );
    res.status(201).json({ Property_ID: result.insertId, AI_Est_Price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT — Sold properties are permanently locked
router.put('/:id', async (req, res) => {
  const { Title, Type, Location, Price, Status, Owner_ID, Agent_ID } = req.body;
  try {
    // Check current status first
    const [[current]] = await db.query('SELECT Status FROM PROPERTY WHERE Property_ID=?', [req.params.id]);
    if (!current) return res.status(404).json({ error: 'Property not found' });
    if (current.Status === 'Sold')
      return res.status(403).json({ error: 'This property has been sold and cannot be modified.' });
    await db.query(
      'UPDATE PROPERTY SET Title=?,Type=?,Location=?,Price=?,Status=?,Owner_ID=?,Agent_ID=? WHERE Property_ID=?',
      [Title, Type, Location, Price, Status, Owner_ID, Agent_ID, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// DELETE
router.delete('/:id', async (req, res) => {
  try { await db.query('DELETE FROM PROPERTY WHERE Property_ID=?', [req.params.id]); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
