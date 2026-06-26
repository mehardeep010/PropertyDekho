// KYA KAR RAHA HAI: Agent portal ka saara SQL — agent ki assigned properties, inquiries,
// leases, payments, sales, aur lease create/terminate + sale create ke transactions.
const pool = require('../db/pool');

const AgentPortalRepository = {
  async getDashboardStats(aid) {
    const [[{ my_properties }]] = await pool.query('SELECT COUNT(*) AS my_properties FROM PROPERTY WHERE Agent_ID=?', [aid]);
    const [[{ new_inquiries }]] = await pool.query("SELECT COUNT(*) AS new_inquiries FROM INQUIRY WHERE Agent_ID=? AND Status='New'", [aid]);
    const [[{ active_leases }]] = await pool.query("SELECT COUNT(*) AS active_leases FROM LEASE l JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Agent_ID=? AND l.End_Date>=CURDATE()", [aid]);
    const [[{ pending_payments }]] = await pool.query("SELECT COUNT(*) AS pending_payments FROM PAYMENT pay JOIN LEASE l ON pay.Lease_ID=l.Lease_ID JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Agent_ID=? AND pay.Status='Pending'", [aid]);
    const [[{ commission_earned }]] = await pool.query(`
      SELECT IFNULL(SUM(pay.Amount * a.Commission_Rate / 100),0) AS commission_earned
      FROM PAYMENT pay
      JOIN LEASE l    ON pay.Lease_ID=l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID=p.Property_ID
      JOIN AGENT a    ON p.Agent_ID=a.Agent_ID
      WHERE p.Agent_ID=? AND pay.Status='Success'`, [aid]);
    return { my_properties, new_inquiries, active_leases, pending_payments, commission_earned };
  },

  findProperties(aid) {
    return pool.query(`
      SELECT p.*, o.Name AS Owner_Name, o.Phone AS Owner_Phone,
             (SELECT COUNT(*) FROM INQUIRY i WHERE i.Property_ID=p.Property_ID) AS inquiry_count,
             (SELECT GROUP_CONCAT(am.Amenity_Name SEPARATOR ', ')
              FROM PROPERTY_AMENITY pa JOIN AMENITY am ON pa.Amenity_ID=am.Amenity_ID
              WHERE pa.Property_ID=p.Property_ID) AS Amenities
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      WHERE p.Agent_ID = ?
      ORDER BY p.Property_ID DESC`, [aid]).then(([rows]) => rows);
  },

  findInquiries(aid) {
    return pool.query(`
      SELECT i.*, p.Title AS Property_Title, p.Location, p.Price,
             t.Tenant_ID, t.Name AS Tenant_Name, t.Phone AS Tenant_Phone, t.Email AS Tenant_Email
      FROM INQUIRY i
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN TENANT t   ON i.Tenant_ID   = t.Tenant_ID
      WHERE i.Agent_ID = ?
      ORDER BY FIELD(i.Status,'New','Responded','Closed'), i.Date DESC`, [aid]).then(([rows]) => rows);
  },

  async updateInquiryStatus(id, aid, status) {
    // Sirf agent ki apni inquiry update ho (Agent_ID match zaroori).
    await pool.query('UPDATE INQUIRY SET Status=? WHERE Inquiry_ID=? AND Agent_ID=?', [status, id, aid]);
  },

  // Lease banao (Pending_Payment) + tenant link + property Pending — sab ek transaction me.
  async createLeaseTx({ propertyId, tenantId, startDate, endDate, monthlyRent, securityDeposit }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        'INSERT INTO LEASE (Start_Date,End_Date,Monthly_Rent,Security_Deposit,Property_ID,Lease_Status) VALUES(?,?,?,?,?,?)',
        [startDate, endDate, monthlyRent, securityDeposit || 0, propertyId, 'Pending_Payment']);
      const leaseId = r.insertId;
      await conn.query('INSERT INTO TENANT_LEASE (Tenant_ID,Lease_ID) VALUES(?,?)', [tenantId, leaseId]);
      await conn.query("UPDATE PROPERTY SET Status='Pending' WHERE Property_ID=?", [propertyId]);
      await conn.commit();
      return leaseId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async findLeaseForTerminate(leaseId, aid) {
    const [[lease]] = await pool.query(`
      SELECT l.Lease_ID, l.Property_ID FROM LEASE l
      JOIN PROPERTY p ON l.Property_ID = p.Property_ID
      WHERE l.Lease_ID = ? AND p.Agent_ID = ?`, [leaseId, aid]);
    return lease || null;
  },

  // Lease Terminated + tenant unlink + (agar Sold nahi hai toh) property Available.
  // Return: property ka status (taaki service sahi message bana sake).
  async terminateLeaseTx({ leaseId, propertyId }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("UPDATE LEASE SET Lease_Status='Terminated' WHERE Lease_ID=?", [leaseId]);
      await conn.query('DELETE FROM TENANT_LEASE WHERE Lease_ID=?', [leaseId]);
      const [[prop]] = await conn.query('SELECT Status FROM PROPERTY WHERE Property_ID=?', [propertyId]);
      if (prop && prop.Status !== 'Sold') {
        await conn.query("UPDATE PROPERTY SET Status='Available' WHERE Property_ID=?", [propertyId]);
      }
      await conn.commit();
      return prop ? prop.Status : null;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  findLeases(aid) {
    return pool.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p           ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`, [aid]).then(([rows]) => rows);
  },

  findPayments(aid) {
    return pool.query(`
      SELECT pay.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM PAYMENT pay
      JOIN LEASE l              ON pay.Lease_ID = l.Lease_ID
      JOIN PROPERTY p           ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      GROUP BY pay.Payment_ID
      ORDER BY pay.Payment_Date DESC`, [aid]).then(([rows]) => rows);
  },

  async findAgentProperty(propertyId, aid) {
    const [[prop]] = await pool.query(
      'SELECT Property_ID, Status FROM PROPERTY WHERE Property_ID=? AND Agent_ID=?', [propertyId, aid]);
    return prop || null;
  },

  async createSaleTx({ propertyId, buyerTenantId, amount }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        "INSERT INTO SALE (Property_ID, Buyer_Tenant_ID, Amount, Sale_Status) VALUES(?,?,?,'Pending_Payment')",
        [propertyId, buyerTenantId, amount]);
      await conn.query("UPDATE PROPERTY SET Status='Pending' WHERE Property_ID=?", [propertyId]);
      await conn.commit();
      return r.insertId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  findSales(aid) {
    return pool.query(`
      SELECT s.*, p.Title AS Property_Title, p.Location, p.Status AS Property_Status,
             t.Name AS Buyer_Name, t.Phone AS Buyer_Phone, t.Email AS Buyer_Email,
             TIMESTAMPDIFF(SECOND, s.Created_At, NOW()) AS seconds_elapsed
      FROM SALE s
      JOIN PROPERTY p ON s.Property_ID     = p.Property_ID
      JOIN TENANT   t ON s.Buyer_Tenant_ID = t.Tenant_ID
      WHERE p.Agent_ID = ?
      ORDER BY s.Created_At DESC`, [aid]).then(([rows]) => rows);
  },
};

module.exports = AgentPortalRepository;
