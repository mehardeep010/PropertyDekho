// KYA KAR RAHA HAI: express-validator ke rules chalne ke baad errors check karta hai.
// KAISE KAR RAHA HAI: Agar koi field galat hai toh saari errors ko ek readable message me
// jod ke 400 (Bad Request) bhej deta hai — galat data DB tak pohunchne se PEHLE hi rok deta hai.
const { validationResult } = require('express-validator');
const ApiError = require('../../utils/ApiError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const message = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
  return next(ApiError.badRequest(message));
}

module.exports = validate;
