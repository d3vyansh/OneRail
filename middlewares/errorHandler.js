const { AppError } = require('../errors/AppError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    const body = { message: err.message };
    if (err.details) {
      body.error = err.details;
    }
    return res.status(err.statusCode).json(body);
  }

  // Not one of our deliberate AppErrors — an unexpected failure (a bug, a
  // driver throwing something we didn't anticipate, etc). Log the real
  // error for debugging, but never leak it to the client.
  console.error('Unexpected error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
};

module.exports = { errorHandler };
