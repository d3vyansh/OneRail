jest.mock('../src/app', () => ({
  app: { listen: jest.fn((_port: unknown, cb?: () => void) => cb?.()) },
}));
jest.mock('../src/dbschema/connection', () => ({
  connectDB: jest.fn(),
}));

describe('index.ts (entry point)', () => {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    jest.resetModules();
    process.exit = jest.fn() as unknown as typeof process.exit;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
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
    connectDB.mockRejectedValue(new Error('bad connection string'));

    require('../src/index');
    await flushPromises();

    expect(app.listen).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to connect to MongoDB, server not started:',
      expect.any(Error)
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
