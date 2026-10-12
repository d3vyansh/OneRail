const mockClient = {
  status: 'ready',
  get: jest.fn(),
  set: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};
const mockRedisCtor = jest.fn(() => mockClient);

jest.mock('ioredis', () => ({ __esModule: true, default: mockRedisCtor }));
jest.mock('../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type CacheModule = typeof import('../src/utils/cache');
type LoggerModule = typeof import('../src/utils/logger');

describe('withCache', () => {
  const originalUrl = process.env.REDIS_URL;
  let cache: CacheModule;
  let logger: LoggerModule['logger'];

  beforeEach(() => {
    jest.resetModules();
    mockClient.status = 'ready';
    mockClient.get.mockReset().mockResolvedValue(null);
    mockClient.set.mockReset().mockResolvedValue('OK');
    mockClient.on.mockReset();
    mockClient.quit.mockReset().mockResolvedValue('OK');
    mockClient.disconnect.mockReset();
    mockRedisCtor.mockClear();
    process.env.REDIS_URL = 'redis://localhost:6379';
    cache = require('../src/utils/cache');
    logger = require('../src/utils/logger').logger;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalUrl;
  });

  it('is switched off when REDIS_URL is unset: calls the fetcher, never opens a connection', async () => {
    delete process.env.REDIS_URL;
    const fetcher = jest.fn().mockResolvedValue(['a']);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual(['a']);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(mockRedisCtor).not.toHaveBeenCalled();
  });

  it('returns the cached value on a hit without calling the fetcher', async () => {
    mockClient.get.mockResolvedValue(JSON.stringify([{ fare: 350 }]));
    const fetcher = jest.fn();

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual([{ fare: 350 }]);

    expect(fetcher).not.toHaveBeenCalled();
    expect(mockClient.set).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith({ key: 'k' }, 'cache hit');
  });

  it('on a miss, calls the fetcher and stores the result with the TTL', async () => {
    const fetcher = jest.fn().mockResolvedValue([{ train_number: '12034' }]);

    await expect(cache.withCache('k', 21600, fetcher)).resolves.toEqual([
      { train_number: '12034' },
    ]);

    expect(mockClient.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify([{ train_number: '12034' }]),
      'EX',
      21600
    );
  });

  it('never caches a failed upstream call (fetcher resolves undefined)', async () => {
    const fetcher = jest.fn().mockResolvedValue(undefined);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toBeUndefined();

    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('does not cache an empty array', async () => {
    const fetcher = jest.fn().mockResolvedValue([]);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual([]);

    expect(mockClient.set).not.toHaveBeenCalled();
  });

  it('fails open when Redis read errors: falls through to the fetcher', async () => {
    mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const fetcher = jest.fn().mockResolvedValue(['fresh']);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual(['fresh']);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('fails open when Redis write errors: still returns the fresh value', async () => {
    mockClient.set.mockRejectedValue(new Error('READONLY'));
    const fetcher = jest.fn().mockResolvedValue(['fresh']);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual(['fresh']);
  });

  it('treats a corrupt (non-JSON) cached value as a miss', async () => {
    mockClient.get.mockResolvedValue('{not json');
    const fetcher = jest.fn().mockResolvedValue(['fresh']);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual(['fresh']);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('gives up on a hung Redis after the timeout and falls through to the fetcher', async () => {
    jest.useFakeTimers();
    mockClient.get.mockReturnValue(new Promise(() => {})); // never settles
    const fetcher = jest.fn().mockResolvedValue(['fresh']);

    const pending = cache.withCache('k', 60, fetcher);
    await jest.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toEqual(['fresh']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('skips the cache instantly (no waiting) while the connection is not ready', async () => {
    mockClient.status = 'reconnecting';
    const fetcher = jest.fn().mockResolvedValue(['fresh']);

    await expect(cache.withCache('k', 60, fetcher)).resolves.toEqual(['fresh']);

    expect(mockClient.get).not.toHaveBeenCalled();
    expect(mockClient.set).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('initCache opens the connection eagerly when REDIS_URL is set', () => {
    cache.initCache();
    expect(mockRedisCtor).toHaveBeenCalledTimes(1);
  });

  it('initCache is a no-op when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;
    cache.initCache();
    expect(mockRedisCtor).not.toHaveBeenCalled();
  });

  it('reuses one client across calls, with sane timeouts configured', async () => {
    await cache.withCache('a', 60, async () => ['x']);
    await cache.withCache('b', 60, async () => ['y']);

    expect(mockRedisCtor).toHaveBeenCalledTimes(1);
    expect(mockRedisCtor).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({ commandTimeout: 1000, connectTimeout: 2000 })
    );
  });

  it('logs Redis connection errors at most once per interval', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await cache.withCache('a', 60, async () => ['x']);
    const errorHandler = mockClient.on.mock.calls.find(([evt]) => evt === 'error')![1];

    errorHandler(new Error('boom'));
    errorHandler(new Error('boom again'));
    expect(logger.warn).toHaveBeenCalledTimes(1);

    (Date.now as jest.Mock).mockReturnValue(1_000_000 + 61_000);
    errorHandler(new Error('still down'));
    expect(logger.warn).toHaveBeenCalledTimes(2);
    (Date.now as jest.Mock).mockRestore();
  });
});

describe('closeCache', () => {
  let cache: CacheModule;

  beforeEach(() => {
    jest.resetModules();
    mockClient.get.mockReset().mockResolvedValue(null);
    mockClient.set.mockReset().mockResolvedValue('OK');
    mockClient.quit.mockReset().mockResolvedValue('OK');
    mockClient.disconnect.mockReset();
    process.env.REDIS_URL = 'redis://localhost:6379';
    cache = require('../src/utils/cache');
  });

  it('is a no-op when no client was ever created', async () => {
    await expect(cache.closeCache()).resolves.toBeUndefined();
    expect(mockClient.quit).not.toHaveBeenCalled();
  });

  it('quits the client gracefully', async () => {
    await cache.withCache('a', 60, async () => ['x']);
    await cache.closeCache();
    expect(mockClient.quit).toHaveBeenCalledTimes(1);
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });

  it('force-disconnects if quit fails', async () => {
    await cache.withCache('a', 60, async () => ['x']);
    mockClient.quit.mockRejectedValue(new Error('already closed'));
    await cache.closeCache();
    expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
  });
});
