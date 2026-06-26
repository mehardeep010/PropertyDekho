// KYA KAR RAHA HAI: TENANT ki business logic.
const TenantRepository = require('../repositories/tenant.repository');
const ApiError = require('../utils/ApiError');

const TenantService = {
  list() {
    return TenantRepository.findAll();
  },
  async getById(id) {
    const tenant = await TenantRepository.findById(id);
    if (!tenant) throw ApiError.notFound('Tenant not found');
    return tenant;
  },
  async create(data) {
    const id = await TenantRepository.create(data);
    return { Tenant_ID: id, ...data };
  },
  async update(id, data) {
    await TenantRepository.update(id, data);
    return { message: 'Updated' };
  },
  async remove(id) {
    await TenantRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = TenantService;
