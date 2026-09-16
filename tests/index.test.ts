jest.mock('../src/app', () => ({
  app: { listen: jest.fn((_port: unknown, cb?: () => void) => cb?.()) },
}));
jest.mock('../src/dbschema/connection', () => ({
  connectDB: jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe('index.ts (entry point)', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    jest.resetModules();
    process.exit = jest.fn() as unknown as typeof process.exit;
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

  it('starts listening once the DB connects successfully', async () => {
    const { connectDB } = jest.requireMock('../src/dbschema/connection') as {
      connectDB: jest.Mock;
    };
    const { app } = jest.requireMock('../src/app') as { app: { listen: jest.Mock } };
    connectDB.mockResolvedValue(undefined);

    require('../src/index');
    await flushPromises();

    expect(connectDB).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledTimes(1);
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('logs and exits(1) if the DB connection fails, without ever listening', async () => {
    const { connectDB } = jest.requireMock('../src/dbschema/connection') as {
      connectDB: jest.Mock;
    };
    const { app } = jest.requireMock('../src/app') as { app: { listen: jest.Mock } };
    const { logger } = jest.requireMock('../src/utils/logger') as {
      logger: { error: jest.Mock };
    };
    connectDB.mockRejectedValue(new Error('bad connection string'));

    require('../src/index');
    await flushPromises();

    expect(app.listen).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Failed to connect to MongoDB, server not started'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
