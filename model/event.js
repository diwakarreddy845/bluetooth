const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let eventSchema = new Schema(
  {
    eventType: Number,
    subData: Number,
    eventDateTime: Date,
    isDeleted: Boolean,
    email: String,
    deviceId: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("Event", eventSchema);
