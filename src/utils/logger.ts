import pino from 'pino';

// Pure decision logic, kept separate from actually constructing the pino
// instance below: pino's pretty-print transport spins up a real worker
// thread, which is safe for a long-running server process but leaks
// resources if repeatedly constructed and discarded in a test process. This
// function can be tested directly without ever touching that transport.
export function getLoggerOptions(env: NodeJS.ProcessEnv = process.env): pino.LoggerOptions {
  const isProduction = env.NODE_ENV === 'production';
  const isTest = env.NODE_ENV === 'test';

  return {
    level: env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
    // Pretty-print for humans locally; raw JSON (pino's default) in
    // production, where a log aggregator (CloudWatch, Datadog, etc.) wants
    // structured lines rather than ANSI-colored text.
    transport:
      isProduction || isTest
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
  };
}

const logger = pino(getLoggerOptions());

export { logger };
