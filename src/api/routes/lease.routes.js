// KYA KAR RAHA HAI: LEASE ke URL -> controller mapping.
const router = require('express').Router();
const LeaseController = require('../controllers/lease.controller');

router.get('/', LeaseController.list);
router.get('/:id', LeaseController.getById);
router.post('/', LeaseController.create);
router.put('/:id', LeaseController.update);
router.delete('/:id', LeaseController.remove);

module.exports = router;
