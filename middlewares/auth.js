const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.jwt;

app.use(express.json());

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
    console.log(req.userId);
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