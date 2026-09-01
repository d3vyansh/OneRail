jest.mock('../dbschema/user_model');

const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../app');
const { userModel } = require('../dbschema/user_model');

describe('POST /api/v1/user/signup', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a user with a hashed password and returns 200', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue({});

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(userModel.create).toHaveBeenCalledTimes(1);

    const createArg = userModel.create.mock.calls[0][0];
    expect(createArg.password).not.toBe('password123');
    await expect(
      bcrypt.compare('password123', createArg.password)
    ).resolves.toBe(true);
  });

  it('rejects an invalid email with 400 and does not touch the DB', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'not-an-email',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already registered', async () => {
    userModel.findOne.mockResolvedValue({ email: 'rider@example.com' });

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('returns 409 on a duplicate-key race (findOne missed it, create hit it)', async () => {
    userModel.findOne.mockResolvedValue(null);
    const dupError = new Error('E11000 duplicate key error');
    dupError.code = 11000;
    userModel.create.mockRejectedValue(dupError);

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(409);
  });

  it('returns 500 on an unexpected DB error', async () => {
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/v1/user/signin', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns a JWT on correct credentials', async () => {
    const hashed = await bcrypt.hash('password123', 12);
    userModel.findOne.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'rider@example.com',
      password: hashed,
    });

    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'rider@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it('returns 403 for a wrong password', async () => {
    const hashed = await bcrypt.hash('password123', 12);
    userModel.findOne.mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      email: 'rider@example.com',
      password: hashed,
    });

    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'rider@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(403);
  });

  it('returns 403 when the user does not exist', async () => {
    userModel.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 for a malformed request body', async () => {
    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'not-an-email',
    });

    expect(res.status).toBe(400);
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('returns 500 on an unexpected DB error', async () => {
    userModel.findOne.mockRejectedValue(new Error('connection reset'));

    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'rider@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(500);
  });
});
