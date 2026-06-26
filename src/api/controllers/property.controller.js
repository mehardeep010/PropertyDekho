// KYA KAR RAHA HAI: PROPERTY ka HTTP layer — req se data nikaalo, service bulao, res bhejo.
// KAISE KAR RAHA HAI: Yahan koi SQL ya business rule nahi hota. Bas request ko service tak
// le jaana aur uska result wapas bhejna. asyncHandler errors ko central handler tak bhej deta
// hai isliye yahan try/catch ki zaroorat nahi.

const asyncHandler = require('../../utils/asyncHandler');
const PropertyService = require('../../services/property.service');

const PropertyController = {
  list: asyncHandler(async (req, res) => {
    res.json(await PropertyService.list());
  }),

  getById: asyncHandler(async (req, res) => {
    res.json(await PropertyService.getById(req.params.id));
  }),

  create: asyncHandler(async (req, res) => {
    const result = await PropertyService.create(req.body);
    res.status(201).json(result);
  }),

  update: asyncHandler(async (req, res) => {
    res.json(await PropertyService.update(req.params.id, req.body));
  }),

  remove: asyncHandler(async (req, res) => {
    res.json(await PropertyService.remove(req.params.id));
  }),
};

module.exports = PropertyController;
