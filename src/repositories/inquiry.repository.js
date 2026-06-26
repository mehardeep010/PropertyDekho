// KYA KAR RAHA HAI: INQUIRY ka saara SQL yahin. Sab parameterized (SQLi safe).
const pool = require('../db/pool');

const InquiryRepository = {
  async findAll() {
    const [rows] = await pool.query(`
      SELECT i.*, t.Name AS Tenant_Name, p.Title AS Property_Title, a.Name AS Agent_Name
      FROM INQUIRY i
      JOIN TENANT t   ON i.Tenant_ID = t.Tenant_ID
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN AGENT a    ON i.Agent_ID = a.Agent_ID
      ORDER BY i.Date DESC`);
    return rows;
  },
  async findById(id) {
    const [rows] = await pool.query(`
      SELECT i.*, t.Name AS Tenant_Name, p.Title AS Property_Title, a.Name AS Agent_Name
      FROM INQUIRY i
      JOIN TENANT t   ON i.Tenant_ID = t.Tenant_ID
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN AGENT a    ON i.Agent_ID = a.Agent_ID
      WHERE i.Inquiry_ID = ?`, [id]);
    return rows[0] || null;
  },
  async create({ Message, Date, Status, Tenant_ID, Property_ID, Agent_ID }) {
    const [result] = await pool.query(
      'INSERT INTO INQUIRY (Message,Date,Status,Tenant_ID,Property_ID,Agent_ID) VALUES(?,?,?,?,?,?)',
      [Message, Date, Status, Tenant_ID, Property_ID, Agent_ID]);
    return result.insertId;
  },
  async updateStatus(id, status) {
    await pool.query('UPDATE INQUIRY SET Status=? WHERE Inquiry_ID=?', [status, id]);
  },
  async remove(id) {
    await pool.query('DELETE FROM INQUIRY WHERE Inquiry_ID = ?', [id]);
  },
};

module.exports = InquiryRepository;
