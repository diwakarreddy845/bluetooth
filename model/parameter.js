const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let parameterSchema = new Schema(
  {
    startingPressure: Number,
    minimumPressure: Number,
    maximumPressure: Number,
    EZEX: Number,
    startingRampPressure: Number,
    rampDuration: Number,
    isDeleted: Boolean,
    email: String,
    deviceId: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("parameter", parameterSchema);
