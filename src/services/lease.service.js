// KYA KAR RAHA HAI: LEASE ki business logic. Stored procedure ke status code ko HTTP error
// me translate karta hai (409 = conflict, 500 = DB error).
const LeaseRepository = require('../repositories/lease.repository');
const ApiError = require('../utils/ApiError');

const LeaseService = {
  list() {
    return LeaseRepository.findAll();
  },

  async getById(id) {
    const lease = await LeaseRepository.findById(id);
    if (!lease) throw ApiError.notFound('Lease not found');
    return lease;
  },

  async create(data) {
    const out = await LeaseRepository.createViaProc({
      Start_Date: data.Start_Date,
      End_Date: data.End_Date,
      Monthly_Rent: data.Monthly_Rent,
      Security_Deposit: data.Security_Deposit || 0,
      Property_ID: data.Property_ID,
      Tenant_ID: data.Tenant_ID || null,
    });

    // Procedure ne agar conflict diya (dusre agent ne property le li) -> 409.
    if (out.status === 409) throw ApiError.conflict(out.message);
    if (out.status === 500) throw new ApiError(500, out.message);

    return { Lease_ID: out.leaseId, message: out.message };
  },

  async update(id, data) {
    await LeaseRepository.update(id, data);
    return { message: 'Updated' };
  },

  async remove(id) {
    await LeaseRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = LeaseService;
