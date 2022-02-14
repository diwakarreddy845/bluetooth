const express = require("express");
const router = require("express").Router();
const userModel = require("./../model/user");
const userService = express();
userService.use(express.json());

router.get("/allUsers", async (req, res) => {
  userModel.find(function (err, data) {
    if (err) {
      console.log(err);
    } else {
      res.send(data);
    }
  });
});

router.post("/save", async (req, res) => {
  var newStudent = new userModel(req.body);
  console.log(newStudent);
  const data = await newStudent.save(function (err, data) {
    if (err) {
      console.log(error);
    } else {
      res.send(data);
    }
  });
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

module.exports = router;
