const express = require('express');
const { Router } = require('express');
const userRouter = Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const { z } = require('zod');
const bcrypt = require('bcrypt');
const { userModel } = require('../dbschema/user_model');
userRouter.use(express.json());

userRouter.post('/signup', async function (req, res) {
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

    const hashedPassword = await bcrypt.hash(password, 5);

    await userModel.create({
      username: username,
      password: hashedPassword,
      email: email,
    });

    res.status(200).json({
      message: 'You have been signed up',
    });
  } catch (e) {
    console.log('Error while Signing Up:', e);
    res.status(500).json({
      message: 'Internal Server Error',
    });
  }
});

userRouter.post('/signin', async function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
    });
  }

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