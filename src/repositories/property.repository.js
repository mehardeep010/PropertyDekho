// KYA KAR RAHA HAI: PROPERTY se related SAARA SQL sirf yahin rehta hai (Repository pattern).
// KAISE KAR RAHA HAI: Service layer ko nahi pata DB MySQL hai ya kuch aur — woh sirf ye
// methods bulata hai. Saari queries parameterized (?) hain, isliye SQL injection safe hai.
// Fayda: "kya app SQL-injection safe hai?" ka jawab dene ke liye sirf ye ek folder dekhna padta hai.

const pool = require('../db/pool');

const PropertyRepository = {
  // Sab properties, owner & agent ke naam ke saath.
  async findAll() {
    const [rows] = await pool.query(`
      SELECT p.*, o.Name AS Owner_Name, a.Name AS Agent_Name
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      ORDER BY p.Property_ID`);
    return rows;
  },

  // Ek property by id.
  async findById(id) {
    const [rows] = await pool.query(`
      SELECT p.*, o.Name AS Owner_Name, a.Name AS Agent_Name
      FROM PROPERTY p
      JOIN OWNER o ON p.Owner_ID = o.Owner_ID
      JOIN AGENT a ON p.Agent_ID = a.Agent_ID
      WHERE p.Property_ID = ?`, [id]);
    return rows[0] || null;
  },

  // Ek property ke amenities.
  async findAmenities(propertyId) {
    const [rows] = await pool.query(`
      SELECT am.Amenity_Name FROM AMENITY am
      JOIN PROPERTY_AMENITY pa ON am.Amenity_ID = pa.Amenity_ID
      WHERE pa.Property_ID = ?`, [propertyId]);
    return rows;
  },

  // Sirf status nikaalo (update ke pehle check karne ke liye).
  async getStatus(id) {
    const [rows] = await pool.query('SELECT Status FROM PROPERTY WHERE Property_ID = ?', [id]);
    return rows[0] ? rows[0].Status : null;
  },

  async create(data) {
    const { Title, Type, Location, Price, Status, AI_Est_Price, Owner_ID, Agent_ID } = data;
    const [result] = await pool.query(
      `INSERT INTO PROPERTY (Title,Type,Location,Price,Status,AI_Est_Price,Owner_ID,Agent_ID)
       VALUES(?,?,?,?,?,?,?,?)`,
      [Title, Type, Location, Price, Status, AI_Est_Price, Owner_ID, Agent_ID]);
    return result.insertId;
  },

  async update(id, data) {
    const { Title, Type, Location, Price, Status, Owner_ID, Agent_ID } = data;
    await pool.query(
      `UPDATE PROPERTY SET Title=?,Type=?,Location=?,Price=?,Status=?,Owner_ID=?,Agent_ID=?
       WHERE Property_ID=?`,
      [Title, Type, Location, Price, Status, Owner_ID, Agent_ID, id]);
  },

  // Sirf AI_Est_Price update (re-estimate ke baad).
  async updateAiPrice(id, aiPrice) {
    await pool.query('UPDATE PROPERTY SET AI_Est_Price = ? WHERE Property_ID = ?', [aiPrice, id]);
  },

  async remove(id) {
    await pool.query('DELETE FROM PROPERTY WHERE Property_ID = ?', [id]);
  },
};

module.exports = PropertyRepository;
