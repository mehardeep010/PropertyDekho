// KYA KAR RAHA HAI: AMENITY ke URL -> controller mapping.
const router = require('express').Router();
const AmenityController = require('../controllers/amenity.controller');

router.get('/', AmenityController.list);
router.post('/', AmenityController.create);
router.delete('/:id', AmenityController.remove);

module.exports = router;
