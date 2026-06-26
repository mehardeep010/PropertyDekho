// KYA KAR RAHA HAI: AGENT ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const AgentController = require('../controllers/agent.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', AgentController.list);
router.get('/:id', v.idOnly, validate, AgentController.getById);
router.post('/', v.agent.write, validate, AgentController.create);
router.put('/:id', [...v.idOnly, ...v.agent.write], validate, AgentController.update);
router.delete('/:id', v.idOnly, validate, AgentController.remove);

module.exports = router;
