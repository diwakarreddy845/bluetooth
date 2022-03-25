const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let feedbackSchema = new Schema(
  {
    rating: Number,
    subject: String,
    description: String,
    isDeleted: Boolean,
    email: String,
    deviceId: String,
  },
  { timestamps: true }
);
module.exports = mongoose.model("feedback", feedbackSchema);
