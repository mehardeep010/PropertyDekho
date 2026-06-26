// KYA KAR RAHA HAI: USERS + role tables ka SQL. Register ek transaction hai (role row +
// USERS row dono saath me bante hain, warna dono rollback).
const pool = require('../db/pool');

const AuthRepository = {
  async findUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM USERS WHERE Email = ?', [email]);
    return rows[0] || null;
  },

  async findUserIdByEmail(email) {
    const [rows] = await pool.query('SELECT User_ID FROM USERS WHERE Email = ?', [email]);
    return rows[0] || null;
  },

  // KYA KAR RAHA HAI: Naya user banata hai — pehle role table (TENANT/OWNER/AGENT) me row,
  // uska ref_id leke USERS me row. Dono ek transaction me taaki adhura data na bache.
  async registerWithRole({ username, email, passwordHash, role, name, phone, commissionRate }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let refId;
      if (role === 'tenant') {
        const [r] = await conn.query('INSERT INTO TENANT (Name,Phone,Email) VALUES(?,?,?)', [name, phone, email]);
        refId = r.insertId;
      } else if (role === 'owner') {
        const [r] = await conn.query('INSERT INTO OWNER (Name,Phone,Email) VALUES(?,?,?)', [name, phone, email]);
        refId = r.insertId;
      } else {
        const rate = parseFloat(commissionRate) || 5.0;
        const [r] = await conn.query('INSERT INTO AGENT (Name,Phone,Commission_Rate) VALUES(?,?,?)', [name, phone, rate]);
        refId = r.insertId;
      }

      await conn.query(
        'INSERT INTO USERS (Username,Email,Password,Role,Ref_ID) VALUES(?,?,?,?,?)',
        [username, email, passwordHash, role, refId]);

      await conn.commit();
      return refId;
    } catch (e) {
      await conn.rollback();
      throw e; // Central error handler ER_DUP_ENTRY ko 409 me badal dega.
    } finally {
      conn.release();
    }
  },

  async updatePassword(userId, passwordHash) {
    await pool.query('UPDATE USERS SET Password=? WHERE User_ID=?', [passwordHash, userId]);
  },
};

module.exports = AuthRepository;
