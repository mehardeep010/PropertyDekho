// KYA KAR RAHA HAI: AGENT ka HTTP layer.
const asyncHandler = require('../../utils/asyncHandler');
const AgentService = require('../../services/agent.service');

const AgentController = {
  list: asyncHandler(async (req, res) => {
    res.json(await AgentService.list());
  }),
  getById: asyncHandler(async (req, res) => {
    res.json(await AgentService.getById(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await AgentService.create(req.body));
  }),
  update: asyncHandler(async (req, res) => {
    res.json(await AgentService.update(req.params.id, req.body));
  }),
  remove: asyncHandler(async (req, res) => {
    res.json(await AgentService.remove(req.params.id));
  }),
};

module.exports = AgentController;
