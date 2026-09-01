const mongoose = require('mongoose');
const connectDB = async () => {
  await mongoose.connect(process.env.mongoURL);
  console.log('MongoDB connected!');
};

module.exports = { connectDB: connectDB };