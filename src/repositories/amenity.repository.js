// KYA KAR RAHA HAI: AMENITY ka saara SQL yahin (Repository pattern). Sab parameterized.
const pool = require('../db/pool');

const AmenityRepository = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM AMENITY ORDER BY Amenity_ID');
    return rows;
  },
  async create(name) {
    const [result] = await pool.query('INSERT INTO AMENITY (Amenity_Name) VALUES(?)', [name]);
    return result.insertId;
  },
  async remove(id) {
    await pool.query('DELETE FROM AMENITY WHERE Amenity_ID = ?', [id]);
  },
};

module.exports = AmenityRepository;
