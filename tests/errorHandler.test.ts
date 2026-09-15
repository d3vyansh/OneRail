import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { app } from '../src/app';
import { errorHandler } from '../src/middlewares/errorHandler';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadGatewayError,
} from '../src/errors/AppError';

describe('AppError subclasses', () => {
  it.each([
    [new BadRequestError('bad input'), 400],
    [new ConflictError('already exists'), 409],
    [new BadGatewayError('upstream down'), 502],
  ])('%p carries the correct statusCode', (err, expectedStatus) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(expectedStatus);
  });

  it('attaches optional details for the handler to surface', () => {
    const err = new BadRequestError('Incorrect Format', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it.each([
    [() => new BadRequestError(), 'Bad Request'],
    [() => new UnauthorizedError(), 'Unauthorized'],
    [() => new ForbiddenError(), 'Forbidden'],
    [() => new NotFoundError(), 'Not Found'],
    [() => new ConflictError(), 'Conflict'],
    [() => new BadGatewayError(), 'Bad Gateway'],
  ])('defaults to a sensible message when none is given (%#)', (build, expectedMessage) => {
    expect(build().message).toBe(expectedMessage);
  });
});

describe('errorHandler middleware (unit)', () => {
  const buildRes = (): Response => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('maps an AppError to its statusCode and message', () => {
    const res = buildRes();
    errorHandler(
      new ConflictError('Email already exists'),
      {} as Request,
      res,
      (() => {}) as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
  });

  it('includes details when the AppError carries them', () => {
    const res = buildRes();
    errorHandler(
      new BadRequestError('Incorrect Format', { email: 'invalid' }),
      {} as Request,
      res,
      (() => {}) as NextFunction
    );

    expect(res.json).toHaveBeenCalledWith({
      message: 'Incorrect Format',
      error: { email: 'invalid' },
    });
  });

  it('reduces a non-AppError to a generic 500 without leaking its message', () => {
    const res = buildRes();
    const originalError = console.error;
    console.error = jest.fn();

    errorHandler(
      new Error('raw DB connection string leaked in here'),
      {} as Request,
      res,
      (() => {}) as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    console.error = originalError;
  });
});

describe('GET /health', () => {
  it('returns 200 with no auth or origin required', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('404 handling (end-to-end)', () => {
  it('returns a clean JSON 404 for an unmatched route instead of an HTML page', async () => {
    const res = await request(app).get('/api/v1/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expect(res.body.message).toMatch(/Route not found/);
  });
});

describe('CORS allowlist (end-to-end)', () => {
  it('rejects a request from an origin not in ALLOWED_ORIGINS', async () => {
    const res = await request(app)
      .get('/api/v1/this-route-does-not-exist')
      .set('Origin', 'http://evil.example.com');

    // cors' origin callback error flows through Express's error handling
    // same as any other thrown error, before even reaching our own routes.
    expect(res.status).toBe(500);
  });

  it('allows a request from an origin in ALLOWED_ORIGINS', async () => {
    const res = await request(app)
      .get('/api/v1/this-route-does-not-exist')
      .set('Origin', 'http://localhost:5173');

    // Passes CORS, then legitimately 404s since the route doesn't exist —
    // proves the allowed origin wasn't blocked before reaching routing.
    expect(res.status).toBe(404);
  });

  it('safely rejects all browser origins when ALLOWED_ORIGINS is entirely unset', async () => {
    const original = process.env.ALLOWED_ORIGINS;
    delete process.env.ALLOWED_ORIGINS;
    jest.resetModules();

    const { app: freshApp } = await import('../src/app');
    const res = await request(freshApp)
      .get('/api/v1/this-route-does-not-exist')
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(500);

    process.env.ALLOWED_ORIGINS = original;
  });
});

describe('error handler wiring sanity check', () => {
  it('is registered as Express error-handling middleware (4-arity)', () => {
    expect(errorHandler.length).toBe(4);
  });

  it('a route that throws a plain Error still gets a safe 500 end-to-end', async () => {
    const testApp = express();
    testApp.get('/boom', () => {
      throw new Error('unexpected failure');
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal Server Error' });
  });
});
