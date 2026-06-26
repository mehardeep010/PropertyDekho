// KYA KAR RAHA HAI: Owner portal ka saara SQL — owner ki properties, inquiries, leases,
// payments aur dashboard. Sab owner-id se scope hota hai (sirf apna data dikhe).
const pool = require('../db/pool');

const OwnerPortalRepository = {
  async getDashboardStats(oid) {
    const [[{ my_properties }]] = await pool.query('SELECT COUNT(*) AS my_properties FROM PROPERTY WHERE Owner_ID=?', [oid]);
    const [[{ active_leases }]] = await pool.query("SELECT COUNT(*) AS active_leases FROM LEASE l JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND l.End_Date>=CURDATE()", [oid]);
    const [[{ open_inquiries }]] = await pool.query("SELECT COUNT(*) AS open_inquiries FROM INQUIRY i JOIN PROPERTY p ON i.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND i.Status IN ('New','Responded')", [oid]);
    const [[{ total_revenue }]] = await pool.query("SELECT IFNULL(SUM(pay.Amount),0) AS total_revenue FROM PAYMENT pay JOIN LEASE l ON pay.Lease_ID=l.Lease_ID JOIN PROPERTY p ON l.Property_ID=p.Property_ID WHERE p.Owner_ID=? AND pay.Status='Success'", [oid]);
    const [statusBreakdown] = await pool.query('SELECT Status, COUNT(*) AS count FROM PROPERTY WHERE Owner_ID=? GROUP BY Status', [oid]);
    return { my_properties, active_leases, open_inquiries, total_revenue, statusBreakdown };
  },

  findProperties(oid) {
    return pool.query(`
      SELECT p.*, a.Name AS Agent_Name, a.Phone AS Agent_Phone,
             (SELECT COUNT(*) FROM INQUIRY i WHERE i.Property_ID=p.Property_ID) AS inquiry_count
      FROM PROPERTY p
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      WHERE p.Owner_ID = ?
      ORDER BY p.Property_ID DESC`, [oid]).then(([rows]) => rows);
  },

  findInquiries(oid) {
    return pool.query(`
      SELECT i.*, p.Title AS Property_Title, t.Name AS Tenant_Name, t.Phone AS Tenant_Phone,
             a.Name AS Agent_Name
      FROM INQUIRY i
      JOIN PROPERTY p ON i.Property_ID = p.Property_ID
      JOIN TENANT t   ON i.Tenant_ID   = t.Tenant_ID
      JOIN AGENT a    ON i.Agent_ID    = a.Agent_ID
      WHERE p.Owner_ID = ?
      ORDER BY i.Date DESC`, [oid]).then(([rows]) => rows);
  },

  findLeases(oid) {
    return pool.query(`
      SELECT l.*, p.Title AS Property_Title,
             GROUP_CONCAT(t.Name SEPARATOR ', ') AS Tenants
      FROM LEASE l
      JOIN PROPERTY p           ON l.Property_ID = p.Property_ID
      LEFT JOIN TENANT_LEASE tl ON l.Lease_ID = tl.Lease_ID
      LEFT JOIN TENANT t        ON tl.Tenant_ID = t.Tenant_ID
      WHERE p.Owner_ID = ?
      GROUP BY l.Lease_ID
      ORDER BY l.Start_Date DESC`, [oid]).then(([rows]) => rows);
  },

  findPayments(oid) {
    return pool.query(`
      SELECT pay.*, p.Title AS Property_Title
      FROM PAYMENT pay
      JOIN LEASE l    ON pay.Lease_ID   = l.Lease_ID
      JOIN PROPERTY p ON l.Property_ID  = p.Property_ID
      WHERE p.Owner_ID = ?
      ORDER BY pay.Payment_Date DESC`, [oid]).then(([rows]) => rows);
  },
};

module.exports = OwnerPortalRepository;
