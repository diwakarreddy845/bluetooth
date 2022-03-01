const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let userDeviceSchema = new Schema(
  {
    userId: String,
    deviceId: String,
    email: String,
    isDeleted: Boolean,
  },
  { timestamps: true }
);
module.exports = mongoose.model("UserDevice", userDeviceSchema);
