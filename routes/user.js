const express = require('express');
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const userRouter = Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const { z } = require('zod');
const bcrypt = require('bcrypt');
const { userModel } = require('../dbschema/user_model');
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

userRouter.post('/signup', authLimiter, async function (req, res) {
  const requiredBody = z.object({
    email: z.string().min(3).max(100).email(),
    username: z.string().min(1).max(20),
    password: z.string().min(1).max(20),
  });

  const parseData = requiredBody.safeParse(req.body);

  if (!parseData.success) {
    return res.status(403).json({
      message: 'Incorrect Format',
      error: parseData.error.format(),
    });
  }
  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;

  try {
    const existingUser = await userModel.findOne({ email: email });
    if (existingUser) {
      return res.status(403).json({
        message: 'Email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await userModel.create({
      username: username,
      password: hashedPassword,
      email: email,
    });

    res.status(200).json({
      message: 'You have been signed up',
    });
  } catch (e) {
    if (e.code === 11000) {
      // Duplicate key on the unique email index — two signups for the same
      // email raced past the findOne check above; the DB is the real guard.
      return res.status(409).json({
        message: 'Email already exists',
      });
    }
    console.log('Error while Signing Up:', e);
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

userRouter.post('/signin', authLimiter, async function (req, res) {
  const requiredBody = z.object({
    email: z.string().min(3).max(100).email(),
    password: z.string().min(1).max(20),
  });

  const parseData = requiredBody.safeParse(req.body);

  if (!parseData.success) {
    return res.status(400).json({
      message: 'Incorrect Format',
      error: parseData.error.format(),
    });
  }

  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await userModel.findOne({
      email: email,
    });

    if (!user) {
      return res.status(403).json({
        message: 'User does not exist, first signup',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(403).json({
        message: 'Incorrect password',
      });
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
  } catch (e) {
    console.error('Error while signing in:', e);
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

module.exports = {
  userRouter: userRouter,
};