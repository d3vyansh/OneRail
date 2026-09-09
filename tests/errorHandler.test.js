const request = require('supertest');
const express = require('express');
const { app } = require('../app');
const { errorHandler } = require('../middlewares/errorHandler');
const {
  AppError,
  BadRequestError,
  ConflictError,
  BadGatewayError,
} = require('../errors/AppError');

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

  it('defaults to a sensible message when none is given', () => {
    expect(new ConflictError().message).toBe('Conflict');
  });
});

describe('errorHandler middleware (unit)', () => {
  const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('maps an AppError to its statusCode and message', () => {
    const res = buildRes();
    errorHandler(new ConflictError('Email already exists'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
  });

  it('includes details when the AppError carries them', () => {
    const res = buildRes();
    errorHandler(
      new BadRequestError('Incorrect Format', { email: 'invalid' }),
      {},
      res,
      () => {}
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

    errorHandler(new Error('raw DB connection string leaked in here'), {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' });
    console.error = originalError;
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
