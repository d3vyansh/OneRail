import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  username: {
    type: String,
    required: true,
  },
  password: { type: String, required: true },
});

export const userModel: Model<IUser> = mongoose.model<IUser>('User', userSchema);
