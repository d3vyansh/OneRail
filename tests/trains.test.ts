jest.mock('../src/controllers/get_trains');
jest.mock('../src/controllers/getFare');
jest.mock('../src/controllers/pnr_sub');
jest.mock('../src/controllers/pnr_alerts');
jest.mock('../src/dbschema/pnr_model');
jest.mock('../src/dbschema/user_model');

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { app } from '../src/app';
import { auth } from '../src/middlewares/auth';
import { getTrains } from '../src/controllers/get_trains';
import { getFare } from '../src/controllers/getFare';
import { subscribePNR } from '../src/controllers/pnr_sub';
import { sendPNRMail } from '../src/controllers/pnr_alerts';
import { pnrModel } from '../src/dbschema/pnr_model';
import { userModel } from '../src/dbschema/user_model';
import { PnrData } from '../src/types/pnr';

const mockedGetTrains = jest.mocked(getTrains);
const mockedGetFare = jest.mocked(getFare);
const mockedSubscribePNR = jest.mocked(subscribePNR);
const mockedSendPNRMail = jest.mocked(sendPNRMail);
const mockedPnrModel = jest.mocked(pnrModel);
const mockedUserModel = jest.mocked(userModel);

const validToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET as string, {
  expiresIn: '7d',
});

describe('auth middleware on train routes', () => {
  it('rejects a request with no token with 401', async () => {
    const res = await request(app).get('/api/v1/train/checktrains');
    expect(res.status).toBe(401);
  });

  it('rejects a request with an invalid token with 403', async () => {
    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', 'not-a-real-token');
    expect(res.status).toBe(403);
  });
});

describe('auth() unit: array-valued token header', () => {
  // Node folds duplicate headers into a single comma-joined string for
  // anything except a handful of special headers (e.g. set-cookie), so a
  // real HTTP request can't actually produce a string[] for our custom
  // `token` header. Express's types allow for it defensively though, so we
  // unit-test the function directly to cover that branch.
  it('uses the first value when the token header is an array', () => {
    const req = { headers: { token: [validToken, 'second-value'] } } as unknown as Request;
    const next: NextFunction = jest.fn();

    auth(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as Request & { userId?: string }).userId).toBe('507f1f77bcf86cd799439011');
  });
});

describe('GET /api/v1/train/checktrains', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns trains for a valid, authenticated request', async () => {
    mockedGetTrains.mockResolvedValue([
      {
        train_name: 'Shatabdi Express',
        train_number: '12034',
        duration: '05:30',
        from_std: 'NDLS',
        to_std: 'CNB',
      },
    ]);

    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', validToken)
      .query({ fromStationCode: 'NDLS', toStationCode: 'CNB', date: '2026-09-01' });

    expect(res.status).toBe(200);
    expect(res.body.trains).toHaveLength(1);
    expect(mockedGetTrains).toHaveBeenCalledWith('NDLS', 'CNB', '2026-09-01');
  });

  it('returns 502 when the upstream API call fails', async () => {
    mockedGetTrains.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', validToken)
      .query({ fromStationCode: 'NDLS', toStationCode: 'CNB', date: '2026-09-01' });

    expect(res.status).toBe(502);
  });

  it('returns 500 when the controller throws', async () => {
    mockedGetTrains.mockRejectedValue(new Error('upstream timeout'));

    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', validToken)
      .query({ fromStationCode: 'NDLS', toStationCode: 'CNB', date: '2026-09-01' });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/v1/train/checkfare', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns fare details for a valid request', async () => {
    mockedGetFare.mockResolvedValue([{ classType: 'SL', fare: 1250 }]);

    const res = await request(app)
      .get('/api/v1/train/checkfare')
      .set('token', validToken)
      .query({ trainNo: '12034', fromStationCode: 'NDLS', toStationCode: 'CNB' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ classType: 'SL', fare: 1250 }]);
  });

  it('returns 502 when the upstream API call fails', async () => {
    mockedGetFare.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/v1/train/checkfare')
      .set('token', validToken)
      .query({ trainNo: '12034', fromStationCode: 'NDLS', toStationCode: 'CNB' });

    expect(res.status).toBe(502);
  });

  it('returns 500 when the controller throws', async () => {
    mockedGetFare.mockRejectedValue(new Error('upstream timeout'));

    const res = await request(app)
      .get('/api/v1/train/checkfare')
      .set('token', validToken)
      .query({ trainNo: '12034', fromStationCode: 'NDLS', toStationCode: 'CNB' });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/train/subscribe-pnr', () => {
  afterEach(() => jest.clearAllMocks());

  it('requires pnrNumber in the body', async () => {
    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({});

    expect(res.status).toBe(400);
    expect(mockedSubscribePNR).not.toHaveBeenCalled();
  });

  it('returns 502 when the PNR cannot be fetched from the upstream API', async () => {
    mockedSubscribePNR.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(502);
    expect(mockedPnrModel.create).not.toHaveBeenCalled();
  });

  it('returns 500 when the user referenced by the token no longer exists', async () => {
    const pnrData: PnrData = {
      user: '507f1f77bcf86cd799439011',
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    };
    mockedSubscribePNR.mockResolvedValue(pnrData);
    (mockedUserModel.findById as unknown as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(500);
    expect(mockedPnrModel.create).not.toHaveBeenCalled();
  });

  it('returns 500 when saving to the DB throws', async () => {
    const pnrData: PnrData = {
      user: '507f1f77bcf86cd799439011',
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    };
    mockedSubscribePNR.mockResolvedValue(pnrData);
    (mockedUserModel.findById as unknown as jest.Mock).mockResolvedValue({
      email: 'rider@example.com',
    });
    (mockedPnrModel.create as unknown as jest.Mock).mockRejectedValue(
      new Error('DB write failed')
    );

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(500);
  });

  it('subscribes, saves to the DB, and emails the user on success', async () => {
    const pnrData: PnrData = {
      user: '507f1f77bcf86cd799439011',
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    };
    mockedSubscribePNR.mockResolvedValue(pnrData);
    (mockedUserModel.findById as unknown as jest.Mock).mockResolvedValue({
      email: 'rider@example.com',
    });
    (mockedPnrModel.create as unknown as jest.Mock).mockResolvedValue(pnrData);
    mockedSendPNRMail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(200);
    expect(mockedPnrModel.create).toHaveBeenCalledWith(pnrData);
    expect(mockedSendPNRMail).toHaveBeenCalledWith('rider@example.com', pnrData);
  });

  it('still returns 200 if the confirmation email fails (email is not the source of truth)', async () => {
    const pnrData: PnrData = {
      user: '507f1f77bcf86cd799439011',
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    };
    mockedSubscribePNR.mockResolvedValue(pnrData);
    (mockedUserModel.findById as unknown as jest.Mock).mockResolvedValue({
      email: 'rider@example.com',
    });
    (mockedPnrModel.create as unknown as jest.Mock).mockResolvedValue(pnrData);
    // sendPNRMail's own implementation swallows errors and resolves; mirror
    // that contract here rather than rejecting.
    mockedSendPNRMail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(200);
  });
});
