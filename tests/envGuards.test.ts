// Verifies the fail-fast behavior added during the TypeScript migration:
// modules that need a specific env var to function throw immediately at
// import time if it's missing, instead of silently proceeding with
// `undefined` and failing confusingly deep inside a request.
describe('environment variable guards', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('auth.ts throws at import time if JWT_SECRET is missing', () => {
    jest.resetModules();
    delete process.env.JWT_SECRET;
    expect(() => require('../src/middlewares/auth')).toThrow(
      'JWT_SECRET environment variable is not set'
    );
  });

  it('routes/user.ts throws at import time if JWT_SECRET is missing', () => {
    jest.resetModules();
    delete process.env.JWT_SECRET;
    expect(() => require('../src/routes/user')).toThrow(
      'JWT_SECRET environment variable is not set'
    );
  });

  it('connectDB throws if mongoURL is missing, without ever calling mongoose.connect', async () => {
    jest.resetModules();
    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: { connect: jest.fn() },
    }));
    delete process.env.mongoURL;

    const { connectDB } = require('../src/dbschema/connection');
    const mongoose = require('mongoose').default;

    await expect(connectDB()).rejects.toThrow('mongoURL environment variable is not set');
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('connectDB calls mongoose.connect with the configured URL when present', async () => {
    jest.resetModules();
    const connectMock = jest.fn().mockResolvedValue(undefined);
    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: { connect: connectMock },
    }));
    process.env.mongoURL = 'mongodb://127.0.0.1:27017/onerail-test';

    const { connectDB } = require('../src/dbschema/connection');
    await connectDB();

    expect(connectMock).toHaveBeenCalledWith('mongodb://127.0.0.1:27017/onerail-test');
  });
});
