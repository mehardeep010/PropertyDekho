// KYA KAR RAHA HAI: Owner portal ki business logic (abhi sirf read-only pass-through).
const OwnerPortalRepository = require('../repositories/ownerPortal.repository');

const OwnerPortalService = {
  getDashboard(oid) { return OwnerPortalRepository.getDashboardStats(oid); },
  getProperties(oid) { return OwnerPortalRepository.findProperties(oid); },
  getInquiries(oid) { return OwnerPortalRepository.findInquiries(oid); },
  getLeases(oid) { return OwnerPortalRepository.findLeases(oid); },
  getPayments(oid) { return OwnerPortalRepository.findPayments(oid); },
};

module.exports = OwnerPortalService;
