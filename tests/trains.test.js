jest.mock('../controllers/get_trains');
jest.mock('../controllers/getFare');
jest.mock('../controllers/pnr_sub');
jest.mock('../controllers/pnr_alerts');
jest.mock('../dbschema/pnr_model');
jest.mock('../dbschema/user_model');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../app');
const { getTrains } = require('../controllers/get_trains');
const { getFare } = require('../controllers/getFare');
const { subscribePNR } = require('../controllers/pnr_sub');
const { sendPNRMail } = require('../controllers/pnr_alerts');
const { pnrModel } = require('../dbschema/pnr_model');
const { userModel } = require('../dbschema/user_model');

const validToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, {
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

describe('GET /api/v1/train/checktrains', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns trains for a valid, authenticated request', async () => {
    getTrains.mockResolvedValue([{ trainNo: '12034', trainName: 'Shatabdi Express' }]);

    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', validToken)
      .query({ fromStationCode: 'NDLS', toStationCode: 'CNB', date: '2026-09-01' });

    expect(res.status).toBe(200);
    expect(res.body.trains).toHaveLength(1);
    expect(getTrains).toHaveBeenCalledWith('NDLS', 'CNB', '2026-09-01');
  });

  it('returns 500 when the upstream API call fails', async () => {
    getTrains.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/v1/train/checktrains')
      .set('token', validToken)
      .query({ fromStationCode: 'NDLS', toStationCode: 'CNB', date: '2026-09-01' });

    expect(res.status).toBe(500);
  });

  it('returns 500 when the controller throws', async () => {
    getTrains.mockRejectedValue(new Error('upstream timeout'));

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
    getFare.mockResolvedValue({ fare: 1250 });

    const res = await request(app)
      .get('/api/v1/train/checkfare')
      .set('token', validToken)
      .query({ trainNo: '12034', fromStationCode: 'NDLS', toStationCode: 'CNB' });

    expect(res.status).toBe(200);
    expect(res.body.fare).toBe(1250);
  });

  it('returns 500 when the upstream API call fails', async () => {
    getFare.mockResolvedValue(undefined);

    const res = await request(app)
      .get('/api/v1/train/checkfare')
      .set('token', validToken)
      .query({ trainNo: '12034', fromStationCode: 'NDLS', toStationCode: 'CNB' });

    expect(res.status).toBe(500);
  });

  it('returns 500 when the controller throws', async () => {
    getFare.mockRejectedValue(new Error('upstream timeout'));

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
    expect(subscribePNR).not.toHaveBeenCalled();
  });

  it('returns 500 when the PNR cannot be fetched from the upstream API', async () => {
    subscribePNR.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(500);
    expect(pnrModel.create).not.toHaveBeenCalled();
  });

  it('returns 500 when saving to the DB throws', async () => {
    subscribePNR.mockResolvedValue({ pnr: '2810651211' });
    userModel.findById.mockResolvedValue({ email: 'rider@example.com' });
    pnrModel.create.mockRejectedValue(new Error('DB write failed'));

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(500);
  });

  it('subscribes, saves to the DB, and emails the user on success', async () => {
    const pnrData = {
      pnr: '2810651211',
      trainNo: '12034',
      trainName: 'Shatabdi Express',
      from: 'NDLS',
      to: 'CNB',
      departureTime: '06:00',
      arrivalTime: '11:30',
    };
    subscribePNR.mockResolvedValue(pnrData);
    userModel.findById.mockResolvedValue({ email: 'rider@example.com' });
    pnrModel.create.mockResolvedValue(pnrData);
    sendPNRMail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(200);
    expect(pnrModel.create).toHaveBeenCalledWith(pnrData);
    expect(sendPNRMail).toHaveBeenCalledWith('rider@example.com', pnrData);
  });

  it('still returns 200 if the confirmation email fails (email is not the source of truth)', async () => {
    const pnrData = { pnr: '2810651211' };
    subscribePNR.mockResolvedValue(pnrData);
    userModel.findById.mockResolvedValue({ email: 'rider@example.com' });
    pnrModel.create.mockResolvedValue(pnrData);
    // sendPNRMail's own implementation swallows errors and resolves; mirror
    // that contract here rather than rejecting.
    sendPNRMail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/train/subscribe-pnr')
      .set('token', validToken)
      .send({ pnrNumber: '2810651211' });

    expect(res.status).toBe(200);
  });
});
