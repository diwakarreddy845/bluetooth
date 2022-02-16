const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let userDevice = new Schema(
  {
    userId: String,
    deviceId: String,
    email: String,
    isDeleted: Boolean,
  },
  { collection: "userDevice" }
);
userDevice.set("timestamps", true);
module.exports = mongoose.model("userDevice", userDevice);
