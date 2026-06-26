// KYA KAR RAHA HAI: AGENT ka saara SQL yahin. Sab parameterized (SQLi safe).
const pool = require('../db/pool');

const AgentRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM AGENT ORDER BY Agent_ID');
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM AGENT WHERE Agent_ID = ?', [id]);
    return rows[0] || null;
  },
  async create({ Name, Phone, Commission_Rate }) {
    const [result] = await pool.query(
      'INSERT INTO AGENT (Name, Phone, Commission_Rate) VALUES (?, ?, ?)',
      [Name, Phone, Commission_Rate]);
    return result.insertId;
  },
  async update(id, { Name, Phone, Commission_Rate }) {
    await pool.query(
      'UPDATE AGENT SET Name=?, Phone=?, Commission_Rate=? WHERE Agent_ID=?',
      [Name, Phone, Commission_Rate, id]);
  },
  async remove(id) {
    await pool.query('DELETE FROM AGENT WHERE Agent_ID = ?', [id]);
  },
};

module.exports = AgentRepository;
