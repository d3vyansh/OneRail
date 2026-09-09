const express = require('express');
const { Router } = require('express');
const trainRouter = Router();
const { auth } = require('../middlewares/auth');
const { getTrains } = require('../controllers/get_trains');
const { getFare } = require('../controllers/getFare');
const { subscribePNR } = require('../controllers/pnr_sub');
const { pnrModel } = require('../dbschema/pnr_model');
const { userModel } = require('../dbschema/user_model');
const { sendPNRMail } = require('../controllers/pnr_alerts');
const { BadRequestError, BadGatewayError } = require('../errors/AppError');
trainRouter.use(express.json());

trainRouter.get('/checktrains', auth, async function (req, res) {
  const fromStationCode = req.query.fromStationCode;
  const toStationCode = req.query.toStationCode;
  const date = req.query.date;

  const returned_trains = await getTrains(fromStationCode, toStationCode, date);

  if (!returned_trains) {
    throw new BadGatewayError('Failed to fetch trains from the upstream API');
  }
  res.status(200).json({ trains: returned_trains });
});

trainRouter.get('/checkfare', auth, async function (req, res) {
  const trainNo = req.query.trainNo;
  const fromStationCode = req.query.fromStationCode;
  const toStationCode = req.query.toStationCode;

  const returned_fare = await getFare(trainNo, fromStationCode, toStationCode);

  if (!returned_fare) {
    throw new BadGatewayError('Failed to fetch trains from the upstream API');
  }
  res.status(200).json(returned_fare);
});

trainRouter.post('/subscribe-pnr', auth, async function (req, res) {
  const pnr = req.body.pnrNumber;
  const userId = req.userId;

  if (!pnr) {
    throw new BadRequestError('pnrNumber is required');
  }

  const returned_pnr = await subscribePNR(pnr, userId);
  if (!returned_pnr) {
    throw new BadGatewayError('Failed to fetch PNR from the upstream API');
  }
  const user = await userModel.findById(userId);
  await pnrModel.create(returned_pnr);
  await sendPNRMail(user.email, returned_pnr);

  res.status(200).json({
    message: 'PNR subscribed successfully',
    data: returned_pnr,
  });
});

module.exports = {
  trainRouter: trainRouter,
};
