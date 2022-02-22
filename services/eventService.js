const express = require("express");
const router = require("express").Router();
const eventModel = require("./../model/event");
const eventService = express();
var hexToBinary = require("hex-to-binary");

eventService.use(express.json());

router.post("/save", async (req, res) => {
  let device = req.body.event;
  device = device.replace(/\s/g, "");
  device = device.replace(/,/g, "");
  const event = dateConversion(device);
  res.json(event);
});

dateConversion = function (hexString) {
  const array = hexString.match(/.{1,10}/g);
  for (let x of array) {
    let twodigitArray = x.match(/.{1,2}/g);
    let text = twodigitArray[1] + twodigitArray[0];

    let text2 = twodigitArray[3] + twodigitArray[2];
    let subData = twodigitArray[4];

    let decimal = hexadecimalConversion(text);
    let decimal2 = hexadecimalConversion(text2);
    let decimal3 = hexadecimalConversion(subData);
    console.log("----", decimal2);
    let year = decimal.slice(0, 7);
    let month = decimal.slice(7, 11);
    let date = decimal.slice(11, 16);

    console.log(year, " ", month, " ", date);

    let yearN = +2000 + +parseInt(year.replace(/\b0+/g, ""), 2).toString(10);

    let monthN = parseInt(month.replace(/\b0+/g, ""), 2).toString(10);
    let dateN = parseInt(date.replace(/\b0+/g, ""), 2).toString(10);

    let hour = decimal2.slice(0, 5);
    let minutes = decimal2.slice(5, 11);
    let type = decimal2.slice(11, 16);

    let hourN = parseInt(hour.replace(/\b0+/g, ""), 2).toString(10);

    let minutesN = parseInt(minutes.replace(/\b0+/g, ""), 2).toString(10);

    let typeN = parseInt(type.replace(/\b0+/g, ""), 2).toString(10);
    console.log(decimal3);
    let presssureDate = parseInt(decimal3.replace(/\b0+/g, ""), 2).toString(10);
    console.log(yearN, monthN - 1, dateN, hourN, minutesN, 0);
    var dateTime = new Date(yearN, monthN - 1, dateN, hourN, minutesN, 0);
    console.log(dateTime);
    let event = {
      eventDateTime: dateTime,
      eventType: typeN,
      subData: presssureDate,
    };

    var newEvent = new eventModel(event);
    let error = newEvent.save(function (err, data) {
      if (err) {
        console.log(err);
        return {
          status: "Failure",
          result: "",
          message: "event saving failed",
        };
      }
    });
    if (error) return error;
  }
};

hexadecimalConversion = function (hexString) {
  let result = "";
  for (const c of hexString) {
    result = result + hexToBinary(c);
  }
  return result;
};

module.exports = router;
