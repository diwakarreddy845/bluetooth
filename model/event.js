const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let event = new Schema(
  {
    eventType: String,
    subData: Number,
    startDateTime: Date,
    endDateTime: Date,
    isDeleted: Boolean,
  },
  { collection: "event" }
);
event.set("timestamps", true);
module.exports = mongoose.model("event", event);
