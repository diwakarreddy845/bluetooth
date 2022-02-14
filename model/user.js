const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let user = new Schema(
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
  { collection: "user" }
);
user.set("timestamps", true);
module.exports = mongoose.model("user", user);
