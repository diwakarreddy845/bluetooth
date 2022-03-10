const express = require("express");
const router = require("express").Router();
const Event = require("./../model/event");
const eventService = express();
var hexToBinary = require("hex-to-binary");
const mongoose = require("mongoose");

const moment = require("moment");

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
  var startDateTime;
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

    if (typeN == 1) {
      startDateTime = dateTime;
    }
    let body = {
      eventDateTime: dateTime,
      eventType: typeN,
      subData: presssureDate,
      eventStartDateTime: startDateTime,
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
  }
};

router.get("/runningTime", async (req, res) => {
  const startDate = moment(+req.query.startDate).format();
  const endDate = moment(+req.query.endDate).format();

  const events = await Event.find({
    deviceId: req.query.deviceId,
    email: req.query.email,
    $and: [
      {
        eventDateTime: {
          $gte: new Date(startDate),
        },
      },
      { eventDateTime: { $lt: new Date(endDate) } },
    ],
  });
  if (events) {
    let lastLeakTtime;
    let totalrunningTime = 0;
    let averageleak = 0;
    let apneaIndex = 0;
    for (let x of events) {
      if (x.eventType == 2) {
        totalrunningTime +=
          moment(x.eventDateTime).unix() - moment(x.eventStartDateTime).unix();
        lastLeakTtime = null;
      } else if (x.eventType == 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime).unix();
        }
        const avgtime = (moment(x.eventDateTime).unix() - lastLeakTtime) / 60;
        averageleak += avgtime * x.subData;
        lastLeakTtime = moment(x.eventDateTime).unix();
        console.log(averageleak);
      } else if (x.eventType == 10 || x.eventType == 9) {
        apneaIndex++;
      }
    }

    totalrunningTime = totalrunningTime / 60;
    averageleak = averageleak / totalrunningTime;
    res.json({
      status: "success",
      result: {
        usageHours: totalrunningTime,
        avgLeak: averageleak,
        ahi: apneaIndex,
      },
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

router.get("/getEventDataBySession", async (req, res) => {
  if (req.query.session == 0) {
    const event = await Event.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: 1,
    }).sort({
      _id: -1,
    });
    console.log(event._id);
    res.json(event);
  } else if (req.query.session == 1) {
  }
});

module.exports = router;
