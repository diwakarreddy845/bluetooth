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

router.post("/login", async (req, res) => {
  const user = await userModel
    .findOne({ email: req.body.email, password: req.body.password })
    .exec();
  if (user != null) {
    user.password = null;
    return res.json({ status: "success", result: user, message: "" });
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

router.get("/getUserByEmail", async (req, res) => {
  const user = await userModel.findOne({ email: req.query.email }).exec();
  if (user != null) {
    user.password = null;
    return res.json({ status: "success", result: user, message: "" });
  } else {
    return res.json({
      status: "failure",
      result: null,
      message: "No User found with credentials",
    });
  }
});

router.get("/forgotPassword", async (req, res) => {
  const user = await userModel.findOne({ email: req.query.email }).exec();
  if (user != null) {
    emailService.sendEmail(req.query.email);
    return res.json({
      status: "success",
      result: user,
      message: "Otp Sent successfully",
    });
  } else {
    return res.json({
      status: "failure",
      result: null,
      message: "Please enter registered email address",
    });
  }
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

router.put("/update", async function (req, res) {
  await userModel
    .findByIdAndUpdate(req.body._id, req.body, { new: true })
    .exec()
    .then((data) => {
      res.json({
        status: "success",
        result: data,
        message: "user saved successfully",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "Failure",
        result: "",
        message: "user not updated",
      });
    });
});

router.put("/updatePassword", async function (req, res) {
  await userModel
    .findByIdAndUpdate(
      { email: req.body.email },
      { $set: { password: req.body.password } },
      { new: true }
    )
    .exec()
    .then((data) => {
      const user = data;
      user.password = null;
      res.json({
        status: "success",
        result: user,
        message: "user saved successfully",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "Failure",
        result: "",
        message: "user not updated",
      });
    });
});

router.put("/changePassword", async function (req, res) {
  await userModel
    .findOneAndUpdate(
      { $and: [{ email: req.body.email }, { password: req.body.password }] },
      { $set: { password: req.body.newPassword } },
      { new: true }
    )
    .exec()
    .then((data) => {
      const user = data;
      user.password = null;
      res.json({
        status: "success",
        result: user,
        message: "user saved successfully",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "Failure",
        result: "",
        message: "user not found",
      });
    });
});

module.exports = router;
