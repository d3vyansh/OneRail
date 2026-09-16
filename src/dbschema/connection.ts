import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  const mongoURL = process.env.mongoURL;
  if (!mongoURL) {
    throw new Error('mongoURL environment variable is not set');
  }
  await mongoose.connect(mongoURL);
  logger.info('MongoDB connected');
};
