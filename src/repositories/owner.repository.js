// KYA KAR RAHA HAI: OWNER ka saara SQL yahin. Sab parameterized (SQLi safe).
const pool = require('../db/pool');

const OwnerRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM OWNER ORDER BY Owner_ID');
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM OWNER WHERE Owner_ID = ?', [id]);
    return rows[0] || null;
  },
  async create({ Name, Phone, Email }) {
    const [result] = await pool.query(
      'INSERT INTO OWNER (Name,Phone,Email) VALUES(?,?,?)', [Name, Phone, Email]);
    return result.insertId;
  },
  async update(id, { Name, Phone, Email }) {
    await pool.query(
      'UPDATE OWNER SET Name=?,Phone=?,Email=? WHERE Owner_ID=?', [Name, Phone, Email, id]);
  },
  async remove(id) {
    await pool.query('DELETE FROM OWNER WHERE Owner_ID = ?', [id]);
  },
};

module.exports = OwnerRepository;
