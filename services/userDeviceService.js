const express = require("express");
const router = require("express").Router();
const userDeviceModel = require("./../model/userDevice");
const userDeviceService = express();

userDeviceService.use(express.json());

router.post("/save", async (req, res) => {
  const user = await userDeviceModel
    .findOne({ deviceId: req.body.deviceId })
    .exec();
  if (user == null) {
    userDeviceModel
      .create(req.body)
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
});

router.get("/getDeviceByEmail", async (req, res) => {
  const device = await userDeviceModel.find({ email: req.query.email });
  if (device != null && device.length > 0) {
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
  const device = await userDeviceModel.findOneAndDelete({
    email: req.query.email,
  });

  if (device != null) {
    return res.json({
      status: "success",
      result: device,
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

module.exports = router;
