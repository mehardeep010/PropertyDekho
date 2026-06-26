// KYA KAR RAHA HAI: Async controller functions ko wrap karta hai.
// KAISE KAR RAHA HAI: Express khud async errors ko nahi pakadta — agar await fail ho jaaye
// toh unhandled rejection ho jaata hai. Ye helper har async controller ko try/catch ke bina
// safe banata hai: koi bhi error aaye toh seedha next(err) ho jaata hai aur central error
// handler use sambhaal leta hai. Isse har controller me try/catch repeat nahi karna padta.

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
