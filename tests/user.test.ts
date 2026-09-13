jest.mock('../src/dbschema/user_model');

import request from 'supertest';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import { userModel } from '../src/dbschema/user_model';

const mockedUserModel = jest.mocked(userModel);

describe('POST /api/v1/user/signup', () => {
  afterEach(() => jest.clearAllMocks());

  it('creates a user with a hashed password and returns 200', async () => {
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue(null);
    (mockedUserModel.create as unknown as jest.Mock).mockResolvedValue({});

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(mockedUserModel.create).toHaveBeenCalledTimes(1);

    const createArg = (mockedUserModel.create as unknown as jest.Mock).mock.calls[0][0];
    expect(createArg.password).not.toBe('password123');
    await expect(bcrypt.compare('password123', createArg.password)).resolves.toBe(true);
  });

  it('rejects an invalid email with 400 and does not touch the DB', async () => {
    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'not-an-email',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(mockedUserModel.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already registered', async () => {
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue({ email: 'rider@example.com' });

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(mockedUserModel.create).not.toHaveBeenCalled();
  });

  it('returns 409 on a duplicate-key race (findOne missed it, create hit it)', async () => {
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue(null);
    const dupError = Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
    (mockedUserModel.create as unknown as jest.Mock).mockRejectedValue(dupError);

    const res = await request(app).post('/api/v1/user/signup').send({
      email: 'rider@example.com',
      username: 'rider',
      password: 'password123',
    });

    expect(res.status).toBe(409);
  });

  it('returns 500 on an unexpected DB error', async () => {
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue(null);
    (mockedUserModel.create as unknown as jest.Mock).mockRejectedValue(
      new Error('connection reset')
    );

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
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue({
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
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue({
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
    (mockedUserModel.findOne as jest.Mock).mockResolvedValue(null);

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
    expect(mockedUserModel.findOne).not.toHaveBeenCalled();
  });

  it('returns 500 on an unexpected DB error', async () => {
    (mockedUserModel.findOne as jest.Mock).mockRejectedValue(new Error('connection reset'));

    const res = await request(app).post('/api/v1/user/signin').send({
      email: 'rider@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(500);
  });
});
