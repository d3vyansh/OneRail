require('dotenv').config();
const { pnrModel } = require('../dbschema/pnr_model');

const subscribePNR = async function (pnr, userId) {
  const url = `https://irctc1.p.rapidapi.com/api/v3/getPNRStatus?pnrNumber=${pnr}`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.xrapid_apikey,
      'x-rapidapi-host': 'irctc1.p.rapidapi.com',
    },
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const apiData = await response.json();
    const pnrdata = {
      user: userId,
      pnr: apiData.data.Pnr,
      trainNo: apiData.data.TrainNo,
      trainName: apiData.data.TrainName,
      from: apiData.data.From,
      to: apiData.data.To,
      departureTime: apiData.data.DepartureTime,
      arrivalTime: apiData.data.ArrivalTime,
    };
    return pnrdata;
  } catch (e) {
    console.error('Error fetching the data:', e.message);
  }
};

module.exports = {
  subscribePNR: subscribePNR,
};