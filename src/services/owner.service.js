// KYA KAR RAHA HAI: OWNER ki business logic.
const OwnerRepository = require('../repositories/owner.repository');
const ApiError = require('../utils/ApiError');

const OwnerService = {
  list() {
    return OwnerRepository.findAll();
  },
  async getById(id) {
    const owner = await OwnerRepository.findById(id);
    if (!owner) throw ApiError.notFound('Owner not found');
    return owner;
  },
  async create(data) {
    const id = await OwnerRepository.create(data);
    return { Owner_ID: id, ...data };
  },
  async update(id, data) {
    await OwnerRepository.update(id, data);
    return { message: 'Updated' };
  },
  async remove(id) {
    await OwnerRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = OwnerService;
