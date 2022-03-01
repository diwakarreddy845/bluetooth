const express = require("express");
const router = require("express").Router();
const Event = require("./../model/event");
const eventService = express();
var hexToBinary = require("hex-to-binary");

eventService.use(express.json());

hexadecimalConversion = function (hexString) {
  let result = "";
  for (const c of hexString) {
    result = result + hexToBinary(c);
  }
  return result;
};

binaryToHexadecimal = function (binaryStr) {
  if (binaryStr.includes("1")) {
    return parseInt(binaryStr.replace(/\b0+/g, ""), 2).toString(10);
  }
  return parseInt(binaryStr, 2).toString(10);
};

router.post("/save", async (req, res) => {
  let device = req.body.event;

  device = device.replace(/\s/g, "");
  device = device.replace(/,/g, "");
  dateConversion(device, req.body.email, req.body.deviceId);
  res.json({
    status: "success",
    result: [],
    message: "Event Data saved",
  });
});

dateConversion = function (hexString, email, deviceId) {
  const array = hexString.match(/.{1,10}/g);
  for (let x of array) {
    let twodigitArray = x.match(/.{1,2}/g);

    let decimal = hexadecimalConversion(twodigitArray[1] + twodigitArray[0]);
    let decimal2 = hexadecimalConversion(twodigitArray[3] + twodigitArray[2]);
    let decimal3 = hexadecimalConversion(twodigitArray[4]);

    let yearN = +2000 + +binaryToHexadecimal(decimal.slice(0, 7));
    let monthN = binaryToHexadecimal(decimal.slice(7, 11));
    let dateN = binaryToHexadecimal(decimal.slice(11, 16));

    let hourN = binaryToHexadecimal(decimal2.slice(0, 5));
    let minutesN = binaryToHexadecimal(decimal2.slice(5, 11));
    let typeN = binaryToHexadecimal(decimal2.slice(11, 16));

    let presssureDate = binaryToHexadecimal(decimal3);

    var dateTime = new Date(yearN, monthN - 1, dateN, hourN, minutesN, 0);

    let body = {
      eventDateTime: dateTime,
      eventType: typeN,
      subData: presssureDate,
      email: email,
      deviceId: deviceId,
    };

    let error = Event.create(body).catch((error) =>
      res.status(500).json({
        status: "Failure",
        result: "",
        message: "event saving failed",
      })
    );

    if (error) return error;
  }
};


module.exports = router;
