import express, { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { userModel } from '../dbschema/user_model';
import { BadRequestError, ConflictError, ForbiddenError } from '../errors/AppError';

const userRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
userRouter.use(express.json());

// Auth endpoints are the highest-value brute-force target in the app, so
// they get a tighter limit than the rest of the API.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

function isDuplicateKeyError(e: unknown): e is { code: number } {
  return typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 11000;
}

userRouter.post('/signup', authLimiter, async function (req: Request, res: Response) {
  const requiredBody = z.object({
    email: z.string().min(3).max(100).email(),
    username: z.string().min(1).max(20),
    password: z.string().min(1).max(20),
  });

  const parseData = requiredBody.safeParse(req.body);

  if (!parseData.success) {
    throw new BadRequestError('Incorrect Format', parseData.error.format());
  }
  const { username, password, email } = parseData.data;

  const existingUser = await userModel.findOne({ email: email });
  if (existingUser) {
    throw new ConflictError('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await userModel.create({
      username: username,
      password: hashedPassword,
      email: email,
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      // Duplicate key on the unique email index — two signups for the same
      // email raced past the findOne check above; the DB is the real guard.
      throw new ConflictError('Email already exists');
    }
    throw e; // unrecognized DB error — let the centralized handler 500 it
  }

  res.status(200).json({
    message: 'You have been signed up',
  });
});

userRouter.post('/signin', authLimiter, async function (req: Request, res: Response) {
  const requiredBody = z.object({
    email: z.string().min(3).max(100).email(),
    password: z.string().min(1).max(20),
  });

  const parseData = requiredBody.safeParse(req.body);

  if (!parseData.success) {
    throw new BadRequestError('Incorrect Format', parseData.error.format());
  }

  const { email, password } = parseData.data;

  const user = await userModel.findOne({
    email: email,
  });

  if (!user) {
    throw new ForbiddenError('User does not exist, first signup');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new ForbiddenError('Incorrect password');
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.status(200).json({
    token: token,
  });
});

export { userRouter };
