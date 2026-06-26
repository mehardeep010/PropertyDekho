// KYA KAR RAHA HAI: INQUIRY ke URL -> controller mapping (+ input validation).
const router = require('express').Router();
const InquiryController = require('../controllers/inquiry.controller');
const validate = require('../middlewares/validate');
const v = require('../validators');

router.get('/', InquiryController.list);
router.get('/:id', v.idOnly, validate, InquiryController.getById);
router.post('/', v.inquiry.create, validate, InquiryController.create);
router.put('/:id', v.inquiry.updateStatus, validate, InquiryController.update);
router.delete('/:id', v.idOnly, validate, InquiryController.remove);

module.exports = router;
