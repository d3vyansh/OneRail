const express = require('express');
const app = express();
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
app.use('/api/v2/trains', trainRouter);
app.use('/api/v1/train', trainRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});