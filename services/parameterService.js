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
    let startingPressure = req.body.params;
    const inputArray = startingPressure.split(",");
    var i,
      j,
      temporary,
      chunk = 5,
      result = "";
    for (i = 0, j = inputArray.length; i < j; i += chunk) {
      temporary = inputArray.slice(i, i + chunk);
      const re = String.fromCharCode.apply(null, temporary);
      result += parseInt(re, 16) + "_";
    }
    const myArray = result.split("_");
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
    email: req.query.email,
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
