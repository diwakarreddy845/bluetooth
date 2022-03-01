const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let userSchema = new Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    profileImage: String,
    gender: String,
    city: String,
    state: String,
    pincode: Number,
    mobile: Number,
    password: String,
    isDeleted: Boolean,
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
