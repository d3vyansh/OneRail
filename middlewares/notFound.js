const { NotFoundError } = require('../errors/AppError');

// Registered after all routes, before the error handler. Anything that
// falls through to here didn't match any route.
const notFound = (req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = { notFound };
