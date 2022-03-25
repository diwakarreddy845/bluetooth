const router = require("express").Router();
const Feedback = require("./../model/feedback");

router.post("/save", async (req, res) => {
  if (
    req.body.deviceId != null &&
    req.body.deviceId != "" &&
    req.body.email != null &&
    req.body.email != ""
  ) {
    await Feedback.create(req.body)
      .then((result) =>
        res.status(200).json({
          status: "success",
          result: result,
          message: "Your feedback has been submitted successfully",
        })
      )
      .catch((error) => res.status(500).json({ msg: error }));
  } else {
    res.json({
      status: "failure",
      message: "DeviceId and email should not be null or empty",
    });
  }
});

module.exports = router;
