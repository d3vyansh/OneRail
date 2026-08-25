require('dotenv').config();
const express = require('express');
const app = express();
const { connectDB } = require('./dbschema/connection');
const { userRouter } = require('./routes/user');
const { trainRouter } = require('./routes/trains');

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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