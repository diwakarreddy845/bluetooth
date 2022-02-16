const express = require("express");
const router = require("express").Router();
const userModel = require("./../model/user");
const userService = express();
userService.use(express.json());

const emailService = require("./emailService");

const response = {
  status: "success",
  result: null,
  message: "",
};

router.get("/login", async (req, res) => {
  const user = await userModel
    .findOne({ email: req.query.email, password: req.query.password })
    .exec();
  if (user != null) {
    user.password = null;
    return res.json({
      status: "success",
      result: user,
      message: "",
    });
  } else {
    return res.json({
      status: "failure",
      result: null,
      message: "No User found with credentials",
    });
  }
});

router.get("/sendOtp", async (req, res) => {
  emailService.sendEmail(req.query.email);
  return res.json({
    status: "success",
    result: null,
    message: "Otp Sent",
  });
});

router.get("/validateOtp", async (req, res) => {
  const validate = emailService.validateOtp(req.query.email, req.query.otp);
  return res.json({
    status: "success",
    result: validate,
    message: "",
  });
});

router.post("/register", async (req, res) => {
  var newUser = new userModel(req.body);
  const user = await userModel.findOne({ email: req.body.email }).exec();
  if (user == null) {
    await newUser.save(function (err, data) {
      if (err) {
        console.log(error);
      }
    });
    newUser.password = null;
    return res.json({
      status: "success",
      result: newUser,
      message: "user saved successfully",
    });
  } else {
    return res.json({
      status: "Failure",
      result: "",
      message: "user already exist",
    });
  }
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

router.get("/forgotPassword", async (req, res) => {
  emailService.sendEmail(req.query.email);
  return res.json({
    status: "success",
    result: null,
    message: "Otp Sent",
  });
});

module.exports = router;
