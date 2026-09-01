const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pnr_Schema = new Schema({
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

const pnrModel = mongoose.model('PnrSubscription', pnr_Schema);
module.exports = {
  pnrModel: pnrModel,
};