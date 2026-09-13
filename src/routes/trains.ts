import express, { Router, Request, Response } from 'express';
import { auth } from '../middlewares/auth';
import { getTrains } from '../controllers/get_trains';
import { getFare } from '../controllers/getFare';
import { subscribePNR } from '../controllers/pnr_sub';
import { pnrModel } from '../dbschema/pnr_model';
import { userModel } from '../dbschema/user_model';
import { sendPNRMail } from '../controllers/pnr_alerts';
import { BadRequestError, BadGatewayError } from '../errors/AppError';

const trainRouter = Router();
trainRouter.use(express.json());

trainRouter.get('/checktrains', auth, async function (req: Request, res: Response) {
  const fromStationCode = req.query.fromStationCode as string;
  const toStationCode = req.query.toStationCode as string;
  const date = req.query.date as string;

  const returned_trains = await getTrains(fromStationCode, toStationCode, date);

  if (!returned_trains) {
    throw new BadGatewayError('Failed to fetch trains from the upstream API');
  }
  res.status(200).json({ trains: returned_trains });
});

trainRouter.get('/checkfare', auth, async function (req: Request, res: Response) {
  const trainNo = req.query.trainNo as string;
  const fromStationCode = req.query.fromStationCode as string;
  const toStationCode = req.query.toStationCode as string;

  const returned_fare = await getFare(trainNo, fromStationCode, toStationCode);

  if (!returned_fare) {
    throw new BadGatewayError('Failed to fetch trains from the upstream API');
  }
  res.status(200).json(returned_fare);
});

trainRouter.post('/subscribe-pnr', auth, async function (req: Request, res: Response) {
  const pnr = req.body.pnrNumber as string | undefined;
  const userId = req.userId as string;

  if (!pnr) {
    throw new BadRequestError('pnrNumber is required');
  }

  const returned_pnr = await subscribePNR(pnr, userId);
  if (!returned_pnr) {
    throw new BadGatewayError('Failed to fetch PNR from the upstream API');
  }
  const user = await userModel.findById(userId);
  if (!user) {
    // The JWT was valid, but the account it refers to no longer exists —
    // e.g. deleted between token issue and this request. Not the client's
    // fault and not something they can fix by changing their request, so
    // this falls through to the generic 500 path rather than a 4xx.
    throw new Error('User account referenced by a valid token no longer exists');
  }
  await pnrModel.create(returned_pnr);
  await sendPNRMail(user.email, returned_pnr);

  res.status(200).json({
    message: 'PNR subscribed successfully',
    data: returned_pnr,
  });
});

export { trainRouter };
