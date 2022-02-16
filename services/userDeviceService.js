const express = require("express");
const router = require("express").Router();
const userDeviceModel = require("./../model/userDevice");
const userDeviceService = express();

userDeviceService.use(express.json());

router.post("/save", async (req, res) => {
  const user = await userDeviceModel.findOne({ email: req.body.email }).exec();
  if (user == null) {
    userDeviceModel
      .create(req.body)
      .then((result) => res.status(200).json({ result }))
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    return res.json({
      status: "Failure",
      result: "",
      message: "user already paired with device",
    });
  }
});

router.get("/allDevice", async (req, res) => {
  userDeviceModel.find({ email: req.query.email }, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      res.send(data);
    }
  });
});

router.delete("/delete", async (req, res) => {
  userDeviceModel.findOneAndDelete(
    { email: req.query.email },
    function (err, data) {
      if (err) {
        console.log(err);
      } else {
        res.send(data);
      }
    }
  );
});

module.exports = router;
