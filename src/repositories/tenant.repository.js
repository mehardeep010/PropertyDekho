// KYA KAR RAHA HAI: TENANT ka saara SQL yahin. Sab parameterized (SQLi safe).
const pool = require('../db/pool');

const TenantRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM TENANT ORDER BY Tenant_ID');
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM TENANT WHERE Tenant_ID = ?', [id]);
    return rows[0] || null;
  },
  async create({ Name, Phone, Email }) {
    const [result] = await pool.query(
      'INSERT INTO TENANT (Name,Phone,Email) VALUES(?,?,?)', [Name, Phone, Email]);
    return result.insertId;
  },
  async update(id, { Name, Phone, Email }) {
    await pool.query(
      'UPDATE TENANT SET Name=?,Phone=?,Email=? WHERE Tenant_ID=?', [Name, Phone, Email, id]);
  },
  async remove(id) {
    await pool.query('DELETE FROM TENANT WHERE Tenant_ID = ?', [id]);
  },
};

module.exports = TenantRepository;
