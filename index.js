const mongoose = require("mongoose"); // Require mongoose library

const express = require("express");
var app = express();

require("dotenv").config(); // Require the dotenv

mongoose
  .connect("mongodb://104.219.41.18:27017/bluetooth?authSource=admin", {
    useNewUrlParser: true,
    user: "mongoadmin",
    pass: "Capv2021",
    keepAlive: true,
  })
  .then(() => {
    console.log("Database connection Success!");
  })
  .catch((err) => {
    console.error("Mongo Connection Error", err);
  });

const PORT = process.env.PORT || 5000;

app.use("/images", express.static("images"));
app.use(express.json());

app.use("/product", require("./services/productController"));
app.use("/user", require("./services/userService"));
app.use("/device", require("./services/userDeviceService"));
app.use("/event", require("./services/eventService"));
app.use("/params", require("./services/parameterService"));
app.use("/feedback", require("./services/feedbackService"));

app.listen(PORT, () => {
  console.log("Server started listening on port : ", PORT);
});
