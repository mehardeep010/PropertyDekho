const router = require('express').Router();
const db = require('../db/connection');

// KYA KAR RAHA HAI: Tenant se rent ya deposit ka payment record karta hai.
// KAISE KAR RAHA HAI:Agar lease peeche se cancel ho gayi toh 'CreatePaymentTx' procedure SQL me lock check karega 
// aur payment ko rollback karke rok dega taaki galat payment na ho jaye.
router.post('/', async (req, res) => {
  const { Payment_Date, Amount, Payment_Type, Method, Lease_ID } = req.body;
  
  try {
    await db.query(`CALL CreatePaymentTx(?, ?, ?, ?, ?, @statusCode, @msg, @newPaymentId)`, 
      [Payment_Date, Amount, Payment_Type || 'Monthly_Rent', Method, Lease_ID]
    );

    const [[result]] = await db.query(`SELECT @statusCode AS status, @msg AS message, @newPaymentId AS paymentId`);

    // Agar lease cancelled/terminated hai toh 409 Conflict bhejega
    if (result.status === 409) {
        return res.status(409).json({ error: result.message });
    } else if (result.status === 500) {
        return res.status(500).json({ error: result.message });
    }

    res.status(201).json({ Payment_ID: result.paymentId, message: result.message });
    
  } catch (e) { 
    res.status(500).json({ error: 'System error calling procedure: ' + e.message }); 
  }
});

// Baki GET routes jo tere existing payments list karne ke hain wo yahan aayenge:
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM PAYMENT ORDER BY Payment_Date DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;