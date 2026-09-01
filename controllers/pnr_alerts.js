const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sendPNRMail = async (email, pnrData) => {
  const textBody = `Your PNR has been subscribed successfully!

PNR: ${pnrData.pnr}
Train: ${pnrData.trainNo} - ${pnrData.trainName}
From: ${pnrData.from} -> ${pnrData.to}
Departure: ${pnrData.departureTime}
Arrival: ${pnrData.arrivalTime}`;

  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: { Data: 'Your PNR Subscription Confirmation', Charset: 'UTF-8' },
      Body: {
        Text: { Data: textBody, Charset: 'UTF-8' },
      },
    },
  });

  try {
    await ses.send(command);
    console.log('PNR confirmation email sent to', email);
  } catch (err) {
    console.error('SES Error while sending PNR confirmation email:', err.message);
  }
};

module.exports = {
  sendPNRMail: sendPNRMail,
};
