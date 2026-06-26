// KYA KAR RAHA HAI: AGENT ke URL -> controller mapping.
const router = require('express').Router();
const AgentController = require('../controllers/agent.controller');

router.get('/', AgentController.list);
router.get('/:id', AgentController.getById);
router.post('/', AgentController.create);
router.put('/:id', AgentController.update);
router.delete('/:id', AgentController.remove);

module.exports = router;
