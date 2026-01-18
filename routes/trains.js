const express = require('express');
const { Router } = require('express');
const trainRouter = Router();
require('dotenv').config();
const { auth } = require('../middlewares/auth');
const { getTrains } = require('../controllers/get_trains');
const { getFare } = require('../controllers/getFare');
const { subscribePNR } = require('../controllers/pnr_sub');
const { pnrModel } = require('../dbschema/pnr_model');
const { sendPNRMail } = require('../controllers/pnr_alerts');
trainRouter.use(express.json());

trainRouter.get('/checktrains', auth, async function (req, res) {
  const fromStationCode = req.query.fromStationCode;
  const toStationCode = req.query.toStationCode;
  const date = req.query.date;
  try {
    const returned_trains = await getTrains(
      fromStationCode,
      toStationCode,
      date
    );

    if (!returned_trains) {
      return res.status(500).json({
        error: 'Failed to fetch trains from the API',
      });
    }
    res.status(200).json({ trains: returned_trains });
  } catch (error) {
    console.error('Error in /checktrains route:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

trainRouter.get('/checkfare', auth, async function (req, res) {
  const trainNo = req.query.trainNo;
  const fromStationCode = req.query.fromStationCode;
  const toStationCode = req.query.toStationCode;
  try {
    const returned_fare = await getFare(
      trainNo,
      fromStationCode,
      toStationCode
    );
    if (!returned_fare) {
      return res.status(500).json({
        error: 'Failed to fetch trains from the API',
      });
    }
    res.status(200).json(returned_fare);
  } catch (error) {
    console.error('Error in /checktrains route:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
trainRouter.get('/subscribe-pnr', auth, async function (req, res) {
  const pnr = req.query.pnrNumber;
  const userId = req.userId;
  try {
    const returned_pnr = await subscribePNR(pnr, userId);
    if (!returned_pnr) {
      return res.status(500).json({
        error: 'Failed to fetch PNR from the API',
      });
    }
    await pnrModel.create(returned_pnr);
    await sendPNRMail(req.user.email, returned_pnr);

    res.status(200).json({
      message: 'PNR subscribed Sucessfully',
      data: returned_pnr,
    });
  } catch (error) {
    res.status(500).json({ error: 'DB CANT BE UPDATED' });
  }
});

module.exports = {
  trainRouter: trainRouter,
};