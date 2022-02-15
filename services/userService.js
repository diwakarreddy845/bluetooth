const express = require("express");
const router = require("express").Router();
const userModel = require("./../model/user");
const userService = express();
userService.use(express.json());

const emailService = require("./emailService");

router.get("/login", async (req, res) => {
  userModel.find({ email: req.query.email }, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      if (req.query.password === data.password) res.send(data);
      else res.send("login Failed");
    }
  });
});

router.get("/sendOtp", async (req, res) => {
  emailService.sendEmail(req.query.email);
  res.send("Otp Sent");
});

router.get("/validateOtp", async (req, res) => {
  res.send(emailService.validateOtp(req.query.email, req.query.otp));
});

router.post("/register", async (req, res) => {
  var newStudent = new userModel(req.body);
  const data = await newStudent.save(function (err, data) {
    if (err) {
      console.log(error);
    } else {
      res.send(data);
    }
  });
});

router.put("/update", function (req, res) {
  userModel.findByIdAndUpdate(req.body._id, req.body, function (err, data) {
    if (err) {
      console.log(error);
    } else {
      res.send(data);
    }
  });
});

module.exports = router;
