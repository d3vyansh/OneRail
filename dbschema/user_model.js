require('dotenv').config();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Object_Id = mongoose.Types.ObjectId;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  username: {
    type: String,
    required: true,
  },
  password: { type: String, required: true },
});

const userModel = mongoose.model('User', userSchema);

module.exports = {
  userModel: userModel,
};