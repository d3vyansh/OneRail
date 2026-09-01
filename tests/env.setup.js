// Loaded by Jest (see jest.config.js -> setupFiles) before any test file or
// application module is required. Several modules (routes/user.js,
// controllers/pnr_alerts.js) read process.env at require-time, so these
// values must exist before app.js is first imported anywhere.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.mongoURL = 'mongodb://127.0.0.1:27017/onerail-test';
process.env.xrapid_apikey = 'test-rapidapi-key';
process.env.AWS_REGION = 'ap-south-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.SES_FROM_EMAIL = 'alerts@onerail.test';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
