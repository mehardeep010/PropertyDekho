// KYA KAR RAHA HAI: OWNER ke URL -> controller mapping.
const router = require('express').Router();
const OwnerController = require('../controllers/owner.controller');

router.get('/', OwnerController.list);
router.get('/:id', OwnerController.getById);
router.post('/', OwnerController.create);
router.put('/:id', OwnerController.update);
router.delete('/:id', OwnerController.remove);

module.exports = router;
