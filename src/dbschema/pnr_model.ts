import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPnrSubscription extends Document {
  user: Types.ObjectId;
  pnr: string;
  trainNo?: string;
  trainName?: string;
  from?: string;
  to?: string;
  departureTime?: string;
  arrivalTime?: string;
}

const pnr_Schema = new Schema<IPnrSubscription>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pnr: {
    type: String,
    required: true,
  },
  trainNo: String,
  trainName: String,
  from: String,
  to: String,
  departureTime: String,
  arrivalTime: String,
});

export const pnrModel: Model<IPnrSubscription> = mongoose.model<IPnrSubscription>(
  'PnrSubscription',
  pnr_Schema
);
