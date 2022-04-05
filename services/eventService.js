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

const percentile = (arr, val) => {
  let i = Math.ceil((val / 100) * arr.length);
  return arr[i - 1];
};

binaryToHexadecimal = function (binaryStr) {
  if (binaryStr.includes("1")) {
    return parseInt(binaryStr.replace(/\b0+/g, ""), 2).toString(10);
  }
  return parseInt(binaryStr, 2).toString(10);
};

router.post("/save", async (req, res) => {
  try {
    let device = req.body.event;
    if (device) {
      const deletedItem = await Event.deleteMany({
        email: req.body.email,
        deviceId: req.body.deviceId,
      });
    }
    device = device.replace(/\s/g, "");
    device = device.replace(/,/g, "");

    dateConversion(device, req.body.email, req.body.deviceId);
    res.json({
      status: "success",
      result: [],
      message: "Event Data saved",
    });
  } catch (e) {
    res.status(500).json({
      status: "Failure",
      result: "",
      message: "event saving failed",
    });
  }
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
  try {
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
    }).catch((err) => console.error(err));

    if (events) {
      let lastLeakTtime;
      let totalrunningTime = 0;
      let averageleak = 0;
      let apneaIndex = 0;
      for (let x of events) {
        if (x.eventType == 2) {
          totalrunningTime +=
            moment(x.eventDateTime).unix() -
            moment(x.eventStartDateTime).unix();
          lastLeakTtime = null;
        } else if (x.eventType == 22) {
          if (!lastLeakTtime) {
            lastLeakTtime = moment(x.eventStartDateTime).unix();
          }
          const avgtime = (moment(x.eventDateTime).unix() - lastLeakTtime) / 60;
          averageleak += avgtime * x.subData;
          lastLeakTtime = moment(x.eventDateTime).unix();
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
        message: "Events found",
      });
    } else {
      res.json({
        status: "failure",
        result: null,
        message: "No Events found",
      });
    }
  } catch (e) {
    res.json({
      status: "failure",
      result: null,
      message: "No Events found",
    });
  }
});

router.get("/getEventDataBySession", async (req, res) => {
  let event, startDate;
  if (req.query.session == 0) {
    event = await Event.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: 1,
    })
      .sort({ _id: -1 })
      .catch((err) => console.error(err));
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").format();
  } else if (req.query.session == 4) {
    startDate = moment().subtract(365, "d").startOf("day").format();
  }
  if (req.query.session != 0) {
    event = await Event.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: 1,
      eventDateTime: {
        $gte: new Date(startDate),
      },
    }).catch((err) => console.error(err));
  }
  let events = null;
  if (event)
    events = await Event.find({
      deviceId: req.query.deviceId,
      email: req.query.email,
      _id: { $gte: event.id },
    }).catch((err) => console.error(err));
  if (events) {
    let lastLeakTtime;
    let totalrunningTime = 0;
    let averageleak = 0;
    let apneaIndex = 0;
    for (let x of events) {
      if (x.eventType === 2) {
        let status =
          moment(x.eventDateTime).valueOf() -
          moment(x.eventStartDateTime).valueOf();
        totalrunningTime += status;
        const avgtime =
          (moment(x.eventDateTime).valueOf() - lastLeakTtime) / 1000 / 60;
        averageleak += avgtime * x.subData;
        lastLeakTtime = null;
      } else if (x.eventType === 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime).valueOf();
        }
        const avgtime =
          (moment(x.eventDateTime).valueOf() - lastLeakTtime) / 1000 / 60;
        averageleak += avgtime * x.subData;
        lastLeakTtime = moment(x.eventDateTime).valueOf();
      } else if (x.eventType === 10 || x.eventType === 9) {
        apneaIndex++;
      }
    }

    totalrunningTime = totalrunningTime / 1000 / 60;
    if (totalrunningTime > 0) {
      averageleak = averageleak / totalrunningTime;
      apneaIndex = apneaIndex / totalrunningTime / 60;
    }
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
      status: "success",
      result: {
        usageHours: 0,
        avgLeak: 0,
        ahi: 0,
      },
      message: "No Data found",
    });
  }
});

router.get("/totalRunningTime", async (req, res) => {
  const timseResponse = await Event.aggregate([
    {
      $match: {
        deviceId: req.query.deviceId,
        eventType: 2,
      },
    },
    {
      $project: {
        totalMinites: {
          $divide: [
            { $subtract: ["$eventDateTime", "$eventStartDateTime"] },
            1000 * 60,
          ],
        },
      },
    },
    {
      $group: { _id: null, time: { $sum: "$totalMinites" } },
    },
  ]).catch((err) => console.error(err));

  res.json({
    status: "success",
    result: timseResponse.length > 0 ? timseResponse[0].time : 0,
    message: "Device found",
  });
});

router.get("/statisticsBySession", async (req, res) => {
  let notUseddays = 0;
  let event, startDate;
  if (req.query.session == 0) {
    notUseddays = 1;
    event = await Event.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: 1,
    })
      .sort({ _id: -1 })
      .catch((err) => console.error(err));
  } else if (req.query.session == 1) {
    notUseddays = 7;
    startDate = moment().subtract(7, "d").startOf("day").format();
  } else if (req.query.session == 2) {
    notUseddays = 30;
    startDate = moment().subtract(30, "d").startOf("day").format();
  } else if (req.query.session == 3) {
    notUseddays = 90;
    startDate = moment().subtract(90, "d").startOf("day").format();
  } else if (req.query.session == 4) {
    notUseddays = 365;
    startDate = moment().subtract(365, "d").startOf("day").format();
  }
  if (req.query.session != 0) {
    event = await Event.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: 1,
      eventDateTime: {
        $gte: new Date(startDate),
      },
    }).catch((err) => console.error(err));
  }
  let eventList = null;
  if (event)
    eventList = await Event.find({
      deviceId: req.query.deviceId,
      email: req.query.email,
      _id: { $gte: event.id },
    })
      .sort({ _id: 1 })
      .catch((err) => console.error(err));
  if (eventList) {
    let lastLeakTtime;
    let averageleak = 0;
    let meadianLeak = [];
    let avgPressureArry = [];
    let lastPressureTtime;
    let averagePressure = 0;
    for (let x of eventList) {
      if (x.eventType === 2) {
        const avgtime =
          (moment(x.eventDateTime).valueOf() - lastLeakTtime) / 1000 / 60;
        averageleak += avgtime * x.subData;
        lastLeakTtime = null;
        meadianLeak.push(avgtime * x.subData);

        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime).valueOf();
        }
        const avgPressure =
          (moment(x.eventDateTime).valueOf() - lastPressureTtime) / 1000 / 60;
        if (avgPressure * x.subData !== 0)
          avgPressureArry.push(avgPressure * x.subData);
        averagePressure += avgPressure * x.subData;
        lastPressureTtime = null;
      } else if (x.eventType === 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime).valueOf();
        }
        const avgtime =
          (moment(x.eventDateTime).valueOf() - lastLeakTtime) / 1000 / 60;
        averageleak += avgtime * x.subData;
        meadianLeak.push(avgtime * x.subData);
        lastLeakTtime = moment(x.eventDateTime).valueOf();
      } else if (x.eventType === 24) {
        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime).valueOf();
        }
        const avgPressure =
          (moment(x.eventDateTime).valueOf() - lastPressureTtime) / 1000 / 60;
        averagePressure += avgPressure * x.subData;
        lastPressureTtime = moment(x.eventDateTime).valueOf();
        if (avgPressure * x.subData !== 0)
          avgPressureArry.push(avgPressure * x.subData);
      }
    }

    const deviceRunningTime = await Event.aggregate([
      {
        $match: {
          _id: { $gte: mongoose.Types.ObjectId(event.id) },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: 2,
        },
      },
      {
        $project: {
          totalMinites: {
            $divide: [
              { $subtract: ["$eventDateTime", "$eventStartDateTime"] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $group: { _id: null, time: { $sum: "$totalMinites" } },
      },
    ]);
    let totalRunningTime = deviceRunningTime[0].time;
    averageleak = averageleak / totalRunningTime / 60;
    averagePressure = averagePressure / totalRunningTime / 60;
    const distict = await Event.aggregate([
      {
        $match: {
          _id: { $gte: mongoose.Types.ObjectId(event.id) },
          deviceId: req.query.deviceId,
          email: req.query.email,
        },
      },
      {
        $project: {
          year: { $year: "$eventDateTime" },
          month: { $month: "$eventDateTime" },
          day: { $dayOfMonth: "$eventDateTime" },
        },
      },
      {
        $group: {
          _id: null,
          distinctDate: {
            $addToSet: { year: "$year", month: "$month", day: "$day" },
          },
        },
      },
    ]);

    const runningtimByDays = await Event.aggregate([
      {
        $match: {
          _id: { $gte: mongoose.Types.ObjectId(event.id) },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: 2,
        },
      },
      {
        $project: {
          totalHours: {
            $divide: [
              {
                $subtract: ["$eventDateTime", "$eventStartDateTime"],
              },
              1000 * 60 * 60,
            ],
          },
          document: "$$ROOT",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$document.eventDateTime" },
            month: { $month: "$document.eventDateTime" },
            day: { $dayOfMonth: "$document.eventDateTime" },
          },
          timeSum: { $sum: "$totalHours" },
        },
      },
    ]);

    let greaterThanFour = 0,
      fourToSix = 0,
      sixToEight = 0,
      eightPlus = 0;
    const mid = Math.floor(runningtimByDays.length / 2);
    const median =
      runningtimByDays.length % 2 !== 0
        ? runningtimByDays[mid].timeSum
        : (runningtimByDays[mid - 1].timeSum + runningtimByDays[mid].timeSum) /
          2;

    avgPressureArry.sort(function (a, b) {
      return a - b;
    });

    const percentile90Pressue = percentile(avgPressureArry, 90);
    const percentile95Pressue = percentile(avgPressureArry, 95);
    const m = Math.floor(meadianLeak.length / 2);
    const mLeakValue =
      meadianLeak.length % 2 !== 0
        ? meadianLeak[m]
        : (meadianLeak[m - 1] + meadianLeak[m]) / 2;
    for (let y of runningtimByDays) {
      if (y.timeSum > 4 && y.timeSum <= 6) {
        fourToSix++;
        greaterThanFour++;
      } else if (y.timeSum > 6 && y.timeSum <= 8) {
        sixToEight++;
        greaterThanFour++;
      } else if (y.timeSum > 8) {
        eightPlus++;
        greaterThanFour++;
      }
    }
    notUseddays = notUseddays - distict[0].distinctDate.length;

    let noofDays = distict[0].distinctDate.length;

    meadianLeak = meadianLeak.filter((val) => val !== 0);
    meadianLeak.sort(function (a, b) {
      return a - b;
    });
    const percentileLeak = percentile(meadianLeak, 90);

    let response = {
      usage: totalRunningTime,
      averageHoursPerNight: totalRunningTime / noofDays,
      medianHoursPerNight: median,
      noofDays: noofDays,
      notUsed: notUseddays,
      averageleak: averageleak,
      meadianLeak: mLeakValue,
      greaterThanFour: greaterThanFour,
      fourToSix: fourToSix,
      sixToEight: sixToEight,
      eightPlus: eightPlus,
      nintyPercentileLeak: percentileLeak,
      averagePressure: averagePressure,
      nintyPercentilePressure: percentile90Pressue,
      nintyFivePercentilePressure: percentile95Pressue,
    };

    res.json({
      status: "success",
      result: response,
      message: "Event Data found",
    });
  } else {
    res.json({
      status: "success",
      result: 0,
      message: "No Event Data found",
    });
  }
});

module.exports = router;
