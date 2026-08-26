require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const { connectDB } = require('./dbschema/connection');
const { userRouter } = require('./routes/user');
const { trainRouter } = require('./routes/trains');

app.use(helmet());


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

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB, server not started:', error);
    process.exit(1);
  });