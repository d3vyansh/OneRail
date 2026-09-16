import { z } from 'zod';
import '../openapi/zodExtend';

export const checkTrainsQuerySchema = z
  .object({
    fromStationCode: z.string().openapi({ example: 'NDLS' }),
    toStationCode: z.string().openapi({ example: 'CNB' }),
    date: z.string().openapi({ example: '2026-09-01', description: 'YYYY-MM-DD' }),
  })
  .openapi('CheckTrainsQuery');

export const trainSummarySchema = z
  .object({
    train_name: z.string().openapi({ example: 'Shatabdi Express' }),
    train_number: z.string().openapi({ example: '12034' }),
    duration: z.string().openapi({ example: '05:30' }),
    from_std: z.string().openapi({ example: 'NDLS' }),
    to_std: z.string().openapi({ example: 'CNB' }),
  })
  .openapi('TrainSummary');

export const checkTrainsResponseSchema = z
  .object({
    trains: z.array(trainSummarySchema),
  })
  .openapi('CheckTrainsResponse');

export const checkFareQuerySchema = z
  .object({
    trainNo: z.string().openapi({ example: '12034' }),
    fromStationCode: z.string().openapi({ example: 'NDLS' }),
    toStationCode: z.string().openapi({ example: 'CNB' }),
  })
  .openapi('CheckFareQuery');

export const fareSummarySchema = z
  .object({
    classType: z.string().openapi({ example: 'SL' }),
    fare: z.number().openapi({ example: 350 }),
  })
  .openapi('FareSummary');

export const checkFareResponseSchema = z.array(fareSummarySchema).openapi('CheckFareResponse');

export const subscribePnrRequestSchema = z
  .object({
    pnrNumber: z.string().openapi({ example: '2810651211' }),
  })
  .openapi('SubscribePnrRequest');

export const pnrDataSchema = z
  .object({
    user: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    pnr: z.string().openapi({ example: '2810651211' }),
    trainNo: z.string().openapi({ example: '12034' }),
    trainName: z.string().openapi({ example: 'Shatabdi Express' }),
    from: z.string().openapi({ example: 'NDLS' }),
    to: z.string().openapi({ example: 'CNB' }),
    departureTime: z.string().openapi({ example: '06:00' }),
    arrivalTime: z.string().openapi({ example: '11:30' }),
  })
  .openapi('PnrData');

export const subscribePnrResponseSchema = z
  .object({
    message: z.string().openapi({ example: 'PNR subscribed successfully' }),
    data: pnrDataSchema,
  })
  .openapi('SubscribePnrResponse');
