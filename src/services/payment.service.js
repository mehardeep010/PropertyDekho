// KYA KAR RAHA HAI: PAYMENT ki business logic. Procedure ke status code ko HTTP error me badalta hai.
const PaymentRepository = require('../repositories/payment.repository');
const ApiError = require('../utils/ApiError');

const PaymentService = {
  list() {
    return PaymentRepository.findAll();
  },

  async create(data) {
    const out = await PaymentRepository.createViaProc({
      Payment_Date: data.Payment_Date,
      Amount: data.Amount,
      Payment_Type: data.Payment_Type || 'Monthly_Rent',
      Method: data.Method,
      Lease_ID: data.Lease_ID,
    });

    // Lease cancelled/terminated -> 409 Conflict (procedure ne rollback kar diya).
    if (out.status === 409) throw ApiError.conflict(out.message);
    if (out.status === 500) throw new ApiError(500, out.message);

    return { Payment_ID: out.paymentId, message: out.message };
  },
};

module.exports = PaymentService;
