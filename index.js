const express = require('express');
const app = express();
const { userRouter } = require('./routes/user');
const { trainRouter } = require('./routes/trains');

app.use('/api/v1/user', userRouter);
app.use('/api/v2/trains');
app.use('/api/v1/train', trainRouter);

app.listen(3000);