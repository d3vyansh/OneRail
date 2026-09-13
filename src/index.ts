import 'dotenv/config';
import { app } from './app';
import { connectDB } from './dbschema/connection';

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
