// KYA KAR RAHA HAI: AMENITY ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const AmenityController = require('../controllers/amenity.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', AmenityController.list);
router.post('/', v.amenity.create, validate, AmenityController.create);
router.delete('/:id', v.idOnly, validate, AmenityController.remove);

module.exports = router;
