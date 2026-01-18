const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const sns = new AWS.SNS();

const sendPNRMail = async (email, pnrData) => {
  const message = `
      Your PNR has been subscribed successfully!
  
      🧾 PNR: ${pnrData.pnr}
      🚆 Train: ${pnrData.trainNo} - ${pnrData.trainName}
      🛤️ From: ${pnrData.from} → ${pnrData.to}
      ⏰ Departure: ${pnrData.departureTime}
      🕒 Arrival: ${pnrData.arrivalTime}
    `;
  const params = {
    Message: message,
    Subject: 'Your PNR Subscription Confirmation',
    TopicArn: undefined,
    TargetArn: undefined,
    PhoneNumber: undefined,
    MessageStructure: 'string',
    Protocol: 'email',
    Endpoint: email,
  };
  try {
    const result = await sns
      .subscribe({
        Protocol: 'email',
        TopicArn: '',
        Endpoint: email,
      })
      .promise();

    console.log('Subscription initiated. Check email to confirm:', result);

    await sns.publish(params).promise();
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('SNS Error:', err.message);
  }
};

module.exports = {
  sendPNRMail: sendPNRMail,
};