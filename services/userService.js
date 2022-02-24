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
    return res.json({
      status: "success",
      result: user,
      message: "Login Successful",
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
    message: "Otp has been generated successfully",
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
    user.password = null;
    return res.json({
      status: "success",
      result: user,
      message: "Otp has been generated successfully.",
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
    message: "Otp verified successfully",
  });
});

router.post("/register", async (req, res) => {
  const user = await userModel.findOne({ email: req.body.email }).exec();
  if (user == null) {
    await userModel
      .create(req.body)
      .then((result) => {
        result.password = null;
        res.status(200).json({
          status: "success",
          result: result,
          message: "Registration successful",
        });
      })
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    return res.json({
      status: "failure",
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
        message: "You've successfully updated your details",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "failure",
        result: "",
        message: "user not updated",
      });
    });
});

router.put("/updatePassword", async function (req, res) {
  await userModel
    .findOneAndUpdate(
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
        message: "You've successfully updated your password",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "failure",
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
        message: "Your password has been changed successfully",
      });
    })
    .catch((err) => {
      res.status(400).json({
        status: "failure",
        result: "",
        message: "user not found",
      });
    });
});

module.exports = router;
