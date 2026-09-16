import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PnrData } from '../types/pnr';
import { logger } from '../utils/logger';

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// sendPNRMail intentionally never throws: a failed notification email
// should not fail the /subscribe-pnr request, since the subscription
// itself has already been saved to the database by the time this runs.
export const sendPNRMail = async (email: string, pnrData: PnrData): Promise<void> => {
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
    logger.info({ email }, 'PNR confirmation email sent');
  } catch (err) {
    logger.error({ err, email }, 'SES error while sending PNR confirmation email');
  }
};
