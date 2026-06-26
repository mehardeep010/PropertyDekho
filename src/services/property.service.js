// KYA KAR RAHA HAI: PROPERTY ki saari BUSINESS LOGIC yahan rehti hai (rules/decisions).
// KAISE KAR RAHA HAI: Controller sirf HTTP sambhalta hai, repository sirf SQL. Beech ka
// "kya allowed hai, kya nahi" wala dimaag yahan hai. Jaise: "Sold property edit nahi ho
// sakti" — ye rule yahan enforce hota hai, status code ke saath ApiError throw karke.

const PropertyRepository = require('../repositories/property.repository');
const ApiError = require('../utils/ApiError');

const PropertyService = {
  async list() {
    return PropertyRepository.findAll();
  },

  async getById(id) {
    const property = await PropertyRepository.findById(id);
    if (!property) throw ApiError.notFound('Property not found');
    const amenities = await PropertyRepository.findAmenities(id);
    return { ...property, amenities };
  },

  // KYA KAR RAHA HAI: AI estimated price nikaalta hai.
  // KAISE: Abhi ke liye simple heuristic (±10%). PHASE 6 me ye method Gemini API se
  // replace hoga — controller ko isse koi farak nahi padega (yahi seam ka fayda hai).
  estimatePrice(price) {
    return Number((price * (0.9 + Math.random() * 0.2)).toFixed(2));
  },

  async create(data) {
    const AI_Est_Price = this.estimatePrice(data.Price);
    const id = await PropertyRepository.create({
      ...data,
      Status: data.Status || 'Available',
      AI_Est_Price,
    });
    return { Property_ID: id, AI_Est_Price };
  },

  async update(id, data) {
    // RULE: Sold property permanently locked hai — edit nahi ho sakti.
    const currentStatus = await PropertyRepository.getStatus(id);
    if (currentStatus === null) throw ApiError.notFound('Property not found');
    if (currentStatus === 'Sold') {
      throw ApiError.forbidden('This property has been sold and cannot be modified.');
    }
    await PropertyRepository.update(id, data);
    return { message: 'Updated' };
  },

  async remove(id) {
    await PropertyRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = PropertyService;
