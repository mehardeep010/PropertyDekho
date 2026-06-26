// KYA KAR RAHA HAI: Saare request validation rules ek jagah (domain ke hisaab se grouped).
// KAISE KAR RAHA HAI: express-validator ke chains export karte hain. Route me inhe lagate hain,
// uske baad validate middleware errors check karta hai. Fayda: bad/missing input edge pe hi
// ruk jaata hai, aur parameterized queries ke saath milke ye injection + garbage data dono rokta hai.
const { body, param } = require('express-validator');

// Reusable chote helpers.
const idParam = param('id').isInt({ min: 1 }).withMessage('must be a positive integer');
const phone = (f) => body(f).trim().matches(/^\d{10}$/).withMessage('must be a 10-digit number');
const email = (f) => body(f).trim().isEmail().withMessage('must be a valid email');
const nonEmpty = (f) => body(f).trim().notEmpty().withMessage('is required');

const validators = {
  auth: {
    register: [
      body('username').trim().isLength({ min: 3 }).withMessage('min 3 chars'),
      email('email'),
      body('password').isLength({ min: 6 }).withMessage('min 6 chars'),
      body('role').isIn(['tenant', 'owner', 'agent']).withMessage('invalid role'),
      nonEmpty('name'),
      phone('phone'),
      body('commission_rate').optional().isFloat({ min: 0, max: 25 }).withMessage('0-25'),
    ],
    login: [email('email'), nonEmpty('password')],
    forgot: [email('email')],
  },

  property: {
    create: [
      nonEmpty('Title'), nonEmpty('Type'), nonEmpty('Location'),
      body('Price').isFloat({ gt: 0 }).withMessage('must be > 0'),
      body('Status').optional().isIn(['Available', 'Sold', 'Rented', 'Pending']),
      body('Owner_ID').isInt({ min: 1 }), body('Agent_ID').isInt({ min: 1 }),
    ],
    update: [
      idParam,
      nonEmpty('Title'), nonEmpty('Type'), nonEmpty('Location'),
      body('Price').isFloat({ gt: 0 }).withMessage('must be > 0'),
      body('Owner_ID').isInt({ min: 1 }), body('Agent_ID').isInt({ min: 1 }),
    ],
  },

  agent: {
    write: [nonEmpty('Name'), phone('Phone'), body('Commission_Rate').isFloat({ min: 0, max: 25 }).withMessage('0-25')],
  },
  // Owner aur Tenant dono ka shape same: Name, Phone, Email.
  contact: {
    write: [nonEmpty('Name'), phone('Phone'), email('Email')],
  },
  amenity: {
    create: [nonEmpty('Amenity_Name')],
  },

  inquiry: {
    create: [
      nonEmpty('Message'),
      body('Tenant_ID').isInt({ min: 1 }), body('Property_ID').isInt({ min: 1 }),
      body('Agent_ID').optional().isInt({ min: 1 }),
      body('Status').optional().isIn(['New', 'Responded', 'Closed']),
    ],
    updateStatus: [idParam, body('Status').isIn(['New', 'Responded', 'Closed'])],
  },

  lease: {
    create: [
      body('Start_Date').isISO8601().withMessage('must be a date'),
      body('End_Date').isISO8601().withMessage('must be a date'),
      body('Monthly_Rent').isFloat({ gt: 0 }).withMessage('must be > 0'),
      body('Security_Deposit').optional().isFloat({ min: 0 }),
      body('Property_ID').isInt({ min: 1 }),
      body('Tenant_ID').optional({ nullable: true }).isInt({ min: 1 }),
    ],
  },

  payment: {
    create: [
      body('Payment_Date').isISO8601().withMessage('must be a date'),
      body('Amount').isFloat({ gt: 0 }).withMessage('must be > 0'),
      body('Method').trim().notEmpty().withMessage('is required'),
      body('Lease_ID').isInt({ min: 1 }),
      body('Payment_Type').optional().isIn(['Security_Deposit', 'Monthly_Rent', 'Late_Fee', 'Sale_Payment', 'Other']),
    ],
  },

  profile: {
    update: [
      nonEmpty('name'), phone('phone'),
      body('email').optional().trim().isEmail(),
      body('commission_rate').optional().isFloat({ min: 0, max: 25 }),
    ],
    password: [
      body('currentPassword').notEmpty().withMessage('is required'),
      body('newPassword').isLength({ min: 6 }).withMessage('min 6 chars'),
    ],
  },

  tenantPortal: {
    paySecurity: [body('Lease_ID').isInt({ min: 1 }), body('Amount').isFloat({ gt: 0 }), nonEmpty('Method')],
    paySale: [body('Sale_ID').isInt({ min: 1 }), nonEmpty('Method')],
    createInquiry: [body('Property_ID').isInt({ min: 1 }), nonEmpty('Message')],
  },

  agentPortal: {
    createLease: [
      body('Property_ID').isInt({ min: 1 }), body('Tenant_ID').isInt({ min: 1 }),
      body('Start_Date').isISO8601(), body('End_Date').isISO8601(),
      body('Monthly_Rent').isFloat({ gt: 0 }),
      body('Security_Deposit').optional().isFloat({ min: 0 }),
    ],
    createSale: [body('Property_ID').isInt({ min: 1 }), body('Buyer_Tenant_ID').isInt({ min: 1 }), body('Amount').isFloat({ gt: 0 })],
    updateInquiry: [idParam, body('Status').isIn(['New', 'Responded', 'Closed'])],
  },

  idOnly: [idParam],
};

module.exports = validators;
