// KYA KAR RAHA HAI: LEASE ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const LeaseController = require('../controllers/lease.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', LeaseController.list);
router.get('/:id', v.idOnly, validate, LeaseController.getById);
router.post('/', v.lease.create, validate, LeaseController.create);
router.put('/:id', v.idOnly, validate, LeaseController.update);
router.delete('/:id', v.idOnly, validate, LeaseController.remove);

module.exports = router;
