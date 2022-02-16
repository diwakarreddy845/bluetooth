const express = require("express");
const router = require("express").Router();
const eventModel = require("./../model/event");
const eventService = express();
var hexToBinary = require("hex-to-binary");

eventService.use(express.json());

router.post("/save", async (req, res) => {
  var device = req.body;

  const data = await device.save(function (err, data) {
    if (err) {
      console.log(error);
    } else {
      res.send(data);
    }
  });
});

dateConversion = function (hexString) {
  const array = hexString.match(/.{1,10}/g);
  for (let x in array) {
    const twodigitArray = x.match(/.{1,2}/g);
    const text = twodigitArray[1] + twodigitArray[0];
   const decimal = hexadecimalConversion(text)

   var trimmed = s.replace(/\b0+/g, "");

  }
};

hexadecimalConversion = function (hexString) {
    const result;
    for (const c of hexString) {
     result= result+hexToBinary(c);
    }
 return result;
};

module.exports = router;
