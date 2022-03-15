const express = require("express");
const router = require("express").Router();
const Parameter = require("./../model/parameter");

router.post("/save", async (req, res) => {
  if (
    req.body.deviceId != null &&
    req.body.deviceId != "" &&
    req.body.params != null &&
    req.body.params != ""
  ) {
    const myArray = req.body.params.split("_");

    let body = {
      startingPressure: myArray[0],
      minimumPressure: myArray[1],
      maximumPressure: myArray[2],
      EZEX: myArray[3],
      startingRampPressure: myArray[4],
      rampDuration: myArray[5],
      email: req.body.email,
      deviceId: req.body.deviceId,
    };
    Parameter.create(body)
      .then((result) =>
        res.status(200).json({
          status: "success",
          result: result,
          message: "You've successfully saved",
        })
      )
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    res.json({
      status: "failure",
      message: "DeviceId and params should not be null or empty",
    });
  }
});

router.get("/getParamsByDeviceId", async (req, res) => {
  const params = await Parameter.findOne({
    deviceId: req.query.deviceId,
  }).catch((err) => console.error(err));
  if (params) {
    res.json({
      status: "success",
      result: params,
      message: "Parameters found",
    });
  } else {
    res.json({
      status: "failure",
      result: null,
      message: "No params found",
    });
  }
});

module.exports = router;
