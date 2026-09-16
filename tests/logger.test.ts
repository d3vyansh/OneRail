import { getLoggerOptions } from '../src/utils/logger';

describe('getLoggerOptions', () => {
  it('defaults to silent level in the test environment (keeps test output clean)', () => {
    const options = getLoggerOptions({ NODE_ENV: 'test' });
    expect(options.level).toBe('silent');
  });

  it('defaults to info level outside the test environment', () => {
    const options = getLoggerOptions({ NODE_ENV: 'production' });
    expect(options.level).toBe('info');
  });

  it('defaults to info level when NODE_ENV is entirely unset', () => {
    const options = getLoggerOptions({});
    expect(options.level).toBe('info');
  });

  it('LOG_LEVEL overrides the environment default', () => {
    const options = getLoggerOptions({ NODE_ENV: 'test', LOG_LEVEL: 'debug' });
    expect(options.level).toBe('debug');
  });

  it('uses no transport (raw JSON) in production', () => {
    const options = getLoggerOptions({ NODE_ENV: 'production' });
    expect(options.transport).toBeUndefined();
  });

  it('uses no transport (silent, so it does not matter) in test', () => {
    const options = getLoggerOptions({ NODE_ENV: 'test' });
    expect(options.transport).toBeUndefined();
  });

  it('uses the pino-pretty transport for a development-like environment', () => {
    const options = getLoggerOptions({ NODE_ENV: 'development' });
    expect(options.transport).toEqual({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });
  });
});

describe('logger', () => {
  it('the actual exported logger instance is silent (built under NODE_ENV=test)', () => {
    const { logger } = require('../src/utils/logger');
    expect(logger.level).toBe('silent');
  });
});
