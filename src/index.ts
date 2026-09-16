import 'dotenv/config';
import { app } from './app';
import { connectDB } from './dbschema/connection';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error({ err: error }, 'Failed to connect to MongoDB, server not started');
    process.exit(1);
  });
