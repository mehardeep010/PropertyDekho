// KYA KAR RAHA HAI: AMENITY ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const AmenityService = require('../../services/amenity.service');

const AmenityController = {
  list: asyncHandler(async (req, res) => {
    res.json(await AmenityService.list());
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await AmenityService.create(req.body.Amenity_Name));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await AmenityService.remove(req.params.id));
  }),
};

module.exports = AmenityController;
