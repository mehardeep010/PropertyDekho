// KYA KAR RAHA HAI: LEASE ka saara SQL yahin. Lease banane ka kaam SQL stored procedure
// 'CreateLeaseTx' karta hai jo andar SELECT ... FOR UPDATE se row lock lagata hai (ACID).
const pool = require('../db/pool');

const LeaseRepository = {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query(`
      SELECT l.*, p.Title AS Property_Title
      FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      WHERE l.Lease_ID = ?`, [id]);
    return rows[0] || null;
  },

  // KYA KAR RAHA HAI: Stored procedure CreateLeaseTx ko call karta hai.
  // KAISE: ZAROORI -> CALL aur uske baad wala SELECT @vars DONO ek hi connection pe chalne
  // chahiye, kyunki MySQL ke user session variables (@statusCode...) per-connection hote hain.
  // Pool se do alag query calls alag connection le sakte hain -> @vars khaali aa sakte hain.
  // Isliye yahan ek connection pin karke dono statements usi pe chalate hain.
  async createViaProc({ Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, Tenant_ID }) {
    const conn = await pool.getConnection();
    try {
      await conn.query(
        'CALL CreateLeaseTx(?, ?, ?, ?, ?, ?, @statusCode, @msg, @newLeaseId)',
        [Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, Tenant_ID]);
      const [[out]] = await conn.query(
        'SELECT @statusCode AS status, @msg AS message, @newLeaseId AS leaseId');
      return out;
    } finally {
      conn.release();
    }
  },

  async update(id, { Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID }) {
    await pool.query(
      'UPDATE LEASE SET Start_Date=?,End_Date=?,Monthly_Rent=?,Security_Deposit=?,Property_ID=? WHERE Lease_ID=?',
      [Start_Date, End_Date, Monthly_Rent, Security_Deposit, Property_ID, id]);
  },

  async remove(id) {
    await pool.query('DELETE FROM LEASE WHERE Lease_ID = ?', [id]);
  },
};

module.exports = LeaseRepository;
