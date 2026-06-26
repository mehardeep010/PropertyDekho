// KYA KAR RAHA HAI: PROFILE ka SQL — USERS + role table (TENANT/OWNER/AGENT) ko milake.
// NOTE: table/PK naam ek FIXED whitelist se aate hain (user input nahi), isliye inhe query
// me interpolate karna safe hai. Baaki saari values parameterized hain.
const pool = require('../db/pool');

const roleTable = { owner: 'OWNER', agent: 'AGENT', tenant: 'TENANT' };
const rolePK = { owner: 'Owner_ID', agent: 'Agent_ID', tenant: 'Tenant_ID' };

const ProfileRepository = {
  async findUserById(userId) {
    const [[user]] = await pool.query(
      'SELECT User_ID, Username, Email, Role, Ref_ID FROM USERS WHERE User_ID=?', [userId]);
    return user || null;
  },

  async findRoleRow(role, refId) {
    const tbl = roleTable[role];
    const pk = rolePK[role];
    const [[row]] = await pool.query(`SELECT * FROM ${tbl} WHERE ${pk}=?`, [refId]);
    return row || null;
  },

  // KYA KAR RAHA HAI: Email USERS me aur role table me ek saath update — transaction me.
  async updateProfileTx({ role, refId, userId, name, phone, email, commissionRate }) {
    const tbl = roleTable[role];
    const pk = rolePK[role];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (email) {
        await conn.query('UPDATE USERS SET Email=? WHERE User_ID=?', [email, userId]);
      }

      if (role === 'agent') {
        await conn.query(
          `UPDATE ${tbl} SET Name=?, Phone=?, Commission_Rate=? WHERE ${pk}=?`,
          [name, phone, parseFloat(commissionRate) || 5.0, refId]);
      } else {
        await conn.query(
          `UPDATE ${tbl} SET Name=?, Phone=?, Email=? WHERE ${pk}=?`,
          [name, phone, email, refId]);
      }

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async getPasswordHash(userId) {
    const [[user]] = await pool.query('SELECT Password FROM USERS WHERE User_ID=?', [userId]);
    return user ? user.Password : null;
  },

  async updatePassword(userId, passwordHash) {
    await pool.query('UPDATE USERS SET Password=? WHERE User_ID=?', [passwordHash, userId]);
  },
};

module.exports = ProfileRepository;
