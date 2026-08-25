const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

const auth = function (req, res, next) {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({
        message: 'Access Denied. No token provided.',
      });
    }

    const decodedData = jwt.verify(token, JWT_SECRET);

    req.userId = decodedData.id;
    next();
  } catch (error) {
    res.status(403).json({
      message: 'Invalid Token',
      error: error.message,
    });
  }
};

module.exports = {
  auth: auth,
};