// KYA KAR RAHA HAI: INQUIRY ke URL -> controller mapping.
const router = require('express').Router();
const InquiryController = require('../controllers/inquiry.controller');

router.get('/', InquiryController.list);
router.get('/:id', InquiryController.getById);
router.post('/', InquiryController.create);
router.put('/:id', InquiryController.update);
router.delete('/:id', InquiryController.remove);

module.exports = router;
