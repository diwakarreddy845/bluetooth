const express = require("express");
const router = require("express").Router();
const User = require("./../model/user");
const UserDevice = require("./../model/userDevice");
const userService = express();
userService.use(express.json());
const userLogger = require('./../logger/customlogger');

const emailService = require("./emailService");

router.post("/login", async (req, res) => {
  userLogger.info("login -- " + req.body.email);
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password,
  }).exec().catch((err) => {
    userLogger.error("login -- " + req.body.email + " -- " + err)
  });

  const device = await UserDevice.findOne({
    email: req.body.email,
  }).exec().catch((err) => console.error(err));
  if (user != null) {
    user.password = null;
    return res.json({
      status: "success",
      result: user,
      deviceId: device == null ? null : device.deviceId,
      message: "Login Successful",
    });
  } else {
    userLogger.info("no user found -- " + req.body.email)
    return res.json({
      status: "failure",
      result: null,
      message: "No User found with credentials",
    });
  }
});

router.get("/sendOtp", async (req, res) => {
  userLogger.info("sendOtp --" + req.query.email);
  emailService.sendEmail(req.query.email);
  return res.json({
    status: "success",
    result: null,
    message: "Otp has been generated successfully",
  });
});


router.get("/getUserByEmail", async (req, res) => {
  userLogger.info("getUserByEmail -- " + req.query.email);
  const user = await User.findOne({
    email: req.query.email
  }).exec().catch((err) => {
    userLogger.error("getUserByEmail -- " + req.query.email + err);
    console.error(err)
  });
  if (user != null) {
    user.password = null;
    return res.json({
      status: "success",
      result: user,
      message: ""
    });
  } else {
    userLogger.info("getUserByEmail -- no user found");
    return res.json({
      status: "failure",
      result: null,
      message: "No User found with credentials",
    });
  }
});

router.get("/forgotPassword", async (req, res) => {
  userLogger.info("forgotPassword -- " + req.query.email);
  const user = await User.findOne({
    email: req.query.email
  }).exec().catch((err) => console.error(err));
  if (user != null) {
    emailService.resetPasswordTemplate(req.query.email, user.firstName);
    user.password = null;
    return res.json({
      status: "success",
      result: user,
      message: "Otp has been generated successfully.",
    });
  } else {
    userLogger.info("forgotPassword -- no user found");
    return res.json({
      status: "failure",
      result: null,
      message: "Please enter registered email address",
    });
  }
});

router.get("/validateOtp", async (req, res) => {
  userLogger.info("validateOtp -- " + req.query.email);
  const validate = emailService.validateOtp(req.query.email, req.query.otp);
  return res.json({
    status: "success",
    result: validate,
    message: "Otp verified successfully",
  });
});

router.post("/register", async (req, res) => {
  userLogger.info("register -- " + req.body.email);
  const user = await User.findOne({
      email: req.body.email
    })
    .exec()
    .catch((err) => console.error(err));
  if (user == null) {
    await User.create(req.body)
      .then((result) => {
        result.password = null;
        res.status(200).json({
          status: "success",
          result: result,
          message: "Registration successful",
        });
      })
      .catch((error) => {
        userLogger.error("register -- " + req.body.email);
        res.status(500).json({
          msg: error
        })
      });
  } else {
    userLogger.info("register -- user already exist");
    return res.json({
      status: "failure",
      result: "",
      message: "user already exist",
    });
  }
});

router.put("/update", async function (req, res) {
  userLogger.info("update -- " + req.body.email);
  await User.findByIdAndUpdate(req.body._id, req.body, {
      new: true
    }).exec().then((data) => {
      res.json({
        status: "success",
        result: data,
        message: "You've successfully updated your details",
      });
    })
    .catch((err) => {
      userLogger.error("update -- " + err);
      res.status(400).json({
        status: "failure",
        result: "",
        message: "user not updated",
      });
    });
});

router.put("/updatePassword", async function (req, res) {
  userLogger.info("updatePassword -- " + req.body.email);
  await User.findOneAndUpdate({
      email: req.body.email
    }, {
      $set: {
        password: req.body.password
      }
    }, {
      new: true
    })
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
       userLogger.error("updatePassword -- " + err);
      res.status(400).json({
        status: "failure",
        result: "",
        message: "user not updated",
      });
    });
});

router.put("/changePassword", async function (req, res) {
  userLogger.info("changePassword -- " + req.body.email);
  await User.findOneAndUpdate({
      $and: [{
        email: req.body.email
      }, {
        password: req.body.password
      }]
    }, {
      $set: {
        password: req.body.newPassword
      }
    }, {
      new: true
    })
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
      userLogger.error("changePassword -- " + err);
      res.status(400).json({
        status: "failure",
        result: "",
        message: "user not found",
      });
    });
});

router.get("/registrationOtp", async (req, res) => {
   userLogger.info("registrationOtp -- " + req.query.email);
  emailService.sendEmailTemplate(req.query.email, req.query.name).then(res.json({
    status: "success",
    result: null,
    message: "Otp has been generated successfully",
  })).catch((err) => {
    userLogger.error("registrationOtp -- " + err);
    res.status(400).json({
      status: "failure",
      result: "",
      message: "One time code sending failed",
    });
  });;
});

module.exports = router;