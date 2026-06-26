// KYA KAR RAHA HAI: Database se connect karta hai aur ek shared connection pool deta hai.
// KAISE KAR RAHA HAI: Single connection ki jagah 'Connection Pool' banate hain. Isse agar
// 10 users ek saath app use karein toh DB block nahi hoga — MySQL efficiently resources
// manage karega. Config ab src/config se aata hai (hardcoded values hata diye).

const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
});

// KYA KAR RAHA HAI: Startup pe ek baar check karta hai ki DB sach me connect ho raha hai.
async function assertConnection() {
  const conn = await pool.getConnection();
  conn.release();
  return true;
}

module.exports = pool;
module.exports.assertConnection = assertConnection;
