// KYA KAR RAHA HAI: PROFILE ka HTTP layer. Logged-in user req.user me hota hai.
const asyncHandler = require('../../utils/asyncHandler');
const ProfileService = require('../../services/profile.service');

const ProfileController = {
  get: asyncHandler(async (req, res) => {
    res.json(await ProfileService.getProfile(req.user));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await ProfileService.updateProfile(req.user, req.body));
  }),
  changePassword: asyncHandler(async (req, res) => {
    res.json(await ProfileService.changePassword(req.user, req.body));
  }),
};

module.exports = ProfileController;
