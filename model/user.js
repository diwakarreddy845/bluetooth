const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    profileImage: String,
    dob: Date,
    gender: String,
    city: String,
    state: String,
    country: String,
    pincode: Number,
    mobile: Number,
    password: String,
    isDeleted: Boolean,
    provider: String,
    cpapUser: String,
    transcendDevice: String,
    timeZone: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
