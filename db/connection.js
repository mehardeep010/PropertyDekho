const mysql = require('mysql2/promise');
require('dotenv').config();

// KYA KAR RAHA HAI: Ye file database se connect karti hai.
// KAISE KAR RAHA HAI: APPROACHING THE THINGS FROM FIRST PRINCIPLES. 
// Hum single connection ki jagah 'Connection Pool' bana rahe hain. 
// Isse agar 10 users ek sath app use karein, toh DB block nahi hoga, 
// MySQL efficiently resources manage karega.

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'property_mgmt',
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('[DB] Connected successfully via pool.');
        conn.release();
    })
    .catch(err => {
        console.error('[DB] Connection failed:', err);
    });

module.exports = pool;