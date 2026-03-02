/**
 * Wraps an async route handler to catch rejected promises
 * and forward them to Express error handling middleware.
 *
 * Usage: router.get('/route', catchAsync(async (req, res) => { ... }));
 */

const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
