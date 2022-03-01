const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let productSchema = new Schema(
  {
    name: String,
    modelNo: Number,
    isDeleted: Boolean,
    deviceId: String,
    image: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
