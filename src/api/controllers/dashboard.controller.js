// KYA KAR RAHA HAI: DASHBOARD ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const DashboardService = require('../../services/dashboard.service');

const DashboardController = {
  stats: asyncHandler(async (req, res) => {
    res.json(await DashboardService.getStats());
  }),
};

module.exports = DashboardController;
