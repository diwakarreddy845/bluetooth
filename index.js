const mongoose = require("mongoose"); // Require mongoose library

const express = require("express");
var app = express();
require("dotenv").config(); // Require the dotenv

const mongoUri = 'mongodb://cpapcosmosdb:VeomajElo4ikyp73iZMZ6rlQSKd3VlSMyn0GW55k38bPb5M7w82ZEvM0cQK3tYPxy3IbZ5Z2OPhyfkvqozfKSw==@cpapcosmosdb.mongo.cosmos.azure.com:10255/cpap?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@cpapcosmosdb@'

mongoose.connect(mongoUri).then(() => {
  console.log("Database connection Success!");
}).catch((err) => {
  console.error("Mongo Connection Error", err);
});

const PORT = process.env.PORT || 5000;

app.use("/images", express.static("images"));
app.use(express.json({
  limit: '50mb'
}));
app.use(express.urlencoded({
  limit: '50mb',
  extended: true
}));

app.use("/product", require("./services/productController"));
app.use("/user", require("./services/userService"));
app.use("/device", require("./services/userDeviceService"));
app.use("/event", require("./services/eventService"));
app.use("/params", require("./services/parameterService"));
app.use("/feedback", require("./services/feedbackService"));

app.listen(PORT, () => {
  console.log("Server started listening on port : ", PORT);
});