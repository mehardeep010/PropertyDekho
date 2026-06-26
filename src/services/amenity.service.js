// KYA KAR RAHA HAI: AMENITY ki business logic (abhi simple hai).
const AmenityRepository = require('../repositories/amenity.repository');

const AmenityService = {
  list() {
    return AmenityRepository.findAll();
  },
  async create(name) {
    const id = await AmenityRepository.create(name);
    return { Amenity_ID: id, Amenity_Name: name };
  },
  async remove(id) {
    await AmenityRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = AmenityService;
