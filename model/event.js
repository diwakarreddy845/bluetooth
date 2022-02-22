const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let event = new Schema(
  {
    eventType: String,
    subData: Number,
    eventDateTime: Date,
    isDeleted: Boolean,
    email: String,
    deviceId: String,
  },
  { collection: "event" }
);
event.set("timestamps", true);
module.exports = mongoose.model("event", event);
