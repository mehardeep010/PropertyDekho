// KYA KAR RAHA HAI: OWNER ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const OwnerController = require('../controllers/owner.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', OwnerController.list);
router.get('/:id', v.idOnly, validate, OwnerController.getById);
router.post('/', v.contact.write, validate, OwnerController.create);
router.put('/:id', [...v.idOnly, ...v.contact.write], validate, OwnerController.update);
router.delete('/:id', v.idOnly, validate, OwnerController.remove);

module.exports = router;
