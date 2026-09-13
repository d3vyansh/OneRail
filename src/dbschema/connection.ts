import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURL = process.env.mongoURL;
  if (!mongoURL) {
    throw new Error('mongoURL environment variable is not set');
  }
  await mongoose.connect(mongoURL);
  console.log('MongoDB connected!');
};
