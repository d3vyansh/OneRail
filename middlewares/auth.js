const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const JWT_SECRET = process.env.JWT_SECRET;

const auth = function (req, res, next) {
  const token = req.headers.token;

  if (!token) {
    throw new UnauthorizedError('Access Denied. No token provided.');
  }

  try {
    const decodedData = jwt.verify(token, JWT_SECRET);
    req.userId = decodedData.id;
    next();
  } catch (error) {
    throw new ForbiddenError('Invalid Token');
  }
};

module.exports = {
  auth: auth,
};