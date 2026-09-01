const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const { userRouter } = require('./routes/user');
const { trainRouter } = require('./routes/trains');

app.use(helmet());

// Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.
// ALLOWED_ORIGINS=https://onerail.app,http://localhost:5173
// With nothing set, no browser-based origin is allowed — server-to-server
// and tools like curl/Postman (no Origin header) still work either way.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'token'],
  })
);

app.use(express.json());
app.use('/api/v1/user', userRouter);
app.use('/api/v1/train', trainRouter);

module.exports = { app };
