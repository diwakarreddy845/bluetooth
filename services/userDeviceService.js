const express = require("express");
const router = require("express").Router();
const UserDevice = require("./../model/userDevice");

router.post("/save", async (req, res) => {
  if (
    req.body.email != null &&
    req.body.email != "" &&
    req.body.deviceId != null &&
    req.body.deviceId != ""
  ) {
    UserDevice.create(req.body)
      .then((result) =>
        res.status(200).json({
          status: "success",
          result: result,
          message: "You've successfully paired your device",
        })
      )
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    res.json({
      status: "failure",
      message: "Email and DeviceId should not be null or empty",
    });
  }
});

router.get("/getDeviceByEmail", async (req, res) => {
  const device = await UserDevice.findOne({ email: req.query.email });
  if (device) {
    res.json({
      status: "success",
      result: device,
      message: "Device found",
    });
  } else {
    res.json({
      status: "failure",
      result: null,
      message: "No Device found",
    });
  }
});

router.delete("/delete", async (req, res) => {
  const deviceExists = await UserDevice.findOneAndDelete({
    email: req.query.email,
  });

  if (deviceExists) {
    return res.json({
      status: "success",
      result: deviceExists,
      message: "You've successfully unpaired  your device",
    });
  } else {
    return res.json({
      status: "failure",
      result: null,
      message: "No Device found",
    });
  }
});


/*
router.post("/save", async (req, res) => {
  const user = await UserDevice.findOne({
    $or: [{ deviceId: req.body.deviceId }, { email: req.body.email }],
  }).exec();
  if (user == null) {
    UserDevice.create(req.body)
      .then((result) =>
        res.status(200).json({
          status: "success",
          result: result,
          message: "You've successfully paired your device",
        })
      )
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    return res.json({
      status: "failure",
      result: "",
      message: "user already paired with device",
    });
  }
});*/

module.exports = router;
