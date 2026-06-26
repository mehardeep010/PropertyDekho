// KYA KAR RAHA HAI: Admin dashboard ki business logic (abhi sirf stats pass-through).
const DashboardRepository = require('../repositories/dashboard.repository');

const DashboardService = {
  getStats() {
    return DashboardRepository.getStats();
  },
};

module.exports = DashboardService;
