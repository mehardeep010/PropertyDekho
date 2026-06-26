// KYA KAR RAHA HAI: INQUIRY ki business logic.
const InquiryRepository = require('../repositories/inquiry.repository');
const ApiError = require('../utils/ApiError');

const InquiryService = {
  list() {
    return InquiryRepository.findAll();
  },
  async getById(id) {
    const inquiry = await InquiryRepository.findById(id);
    if (!inquiry) throw ApiError.notFound('Inquiry not found');
    return inquiry;
  },
  async create(data) {
    // NOTE: DB trigger trg_inquiry_before_insert khud Agent_ID ko property ke
    // sahi agent se match kar deta hai, isliye yahan default 'New' status set karte hain.
    const id = await InquiryRepository.create({ ...data, Status: data.Status || 'New' });
    return { Inquiry_ID: id };
  },
  async updateStatus(id, status) {
    await InquiryRepository.updateStatus(id, status);
    return { message: 'Updated' };
  },
  async remove(id) {
    await InquiryRepository.remove(id);
    return { message: 'Deleted' };
  },
};

module.exports = InquiryService;
