// utils/asyncHandler.js — Wraps async route handlers so unhandled rejections are forwarded to next()
//
// Usage:
//   router.get('/path', asyncHandler(async (req, res) => {
//     const data = await someAsyncCall();
//     res.json({ data });
//   }));

/**
 * asyncHandler
 * @param {Function} fn  Async Express route handler (req, res, next) => Promise
 * @returns {Function}   Wrapped handler that catches rejections and calls next(err)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
