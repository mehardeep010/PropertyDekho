// KYA KAR RAHA HAI: AGENT ki business logic (notFound check etc.).
const AgentRepository = require('../repositories/agent.repository');
const ApiError = require('../utils/ApiError');

const AgentService = {
  list() {
    return AgentRepository.findAll();
  },
  async getById(id) {
    const agent = await AgentRepository.findById(id);
    if (!agent) throw ApiError.notFound('Agent not found');
    return agent;
  },
  async create(data) {
    const id = await AgentRepository.create(data);
    return { Agent_ID: id, ...data };
  },
  async update(id, data) {
    await AgentRepository.update(id, data);
    return { message: 'Updated' };
  },
  async remove(id) {
    await AgentRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = AgentService;
