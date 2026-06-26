// KYA KAR RAHA HAI: Poore app ka EK central error handler.
// KAISE KAR RAHA HAI: Express me jo bhi error next(err) se aata hai woh yahan aata hai.
// Hum yahan decide karte hain ki client ko kaunsa status aur message bhejna hai. Saari
// error-formatting logic ek jagah — controllers saaf rehte hain.

const ApiError = require('../../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known business errors (ApiError) -> seedha unka status code bhejo.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // MySQL duplicate key (jaise same email/phone) -> 409 Conflict.
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry: record already exists' });
  }

  // MySQL CHECK constraint / trigger SIGNAL (jaise overlapping lease) -> 409.
  if (err.code === 'ER_SIGNAL_EXCEPTION' || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(409).json({ error: err.sqlMessage || err.message });
  }

  // Baaki sab = unexpected bug. Server pe poora log karo (request-id ke saath, taaki trace ho
  // sake), client ko sirf generic message (stack trace leak nahi karte).
  const log = req.log || require('../../utils/logger');
  log.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
