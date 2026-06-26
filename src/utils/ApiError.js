// KYA KAR RAHA HAI: Ek custom Error class jisme HTTP status code bhi hota hai.
// KAISE KAR RAHA HAI: Jab service layer me koi business rule toote (jaise "property already
// sold"), hum `throw new ApiError(409, '...')` karte hain. Central error handler is status
// code ko padh ke sahi HTTP response bhej deta hai. Isse controllers me bar-bar
// res.status().json() likhne ki zaroorat nahi padti.

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    // isOperational = ye expected error hai (jaise validation), bug nahi.
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg) { return new ApiError(400, msg); }
  static unauthorized(msg) { return new ApiError(401, msg); }
  static forbidden(msg) { return new ApiError(403, msg); }
  static notFound(msg) { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}

module.exports = ApiError;
