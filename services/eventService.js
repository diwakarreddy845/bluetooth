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
      $and: [{
          eventDateTime: {
            $gte: new Date(startDate),
          },
        },
        {
          eventDateTime: {
            $lt: new Date(endDate)
          }
        },
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
      .sort({
        _id: -1
      })
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
      _id: {
        $gte: event.id
      },
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
  const timseResponse = await Event.aggregate([{
      $match: {
        deviceId: req.query.deviceId,
        eventType: 2,
      },
    },
    {
      $project: {
        totalMinites: {
          $divide: [{
                $subtract: ["$eventDateTime", "$eventStartDateTime"]
              },
            1000 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        time: {
          $sum: "$totalMinites"
        }
      },
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
      .sort({
        _id: -1
      })
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
      _id: {
        $gte: event.id
      },
    })
    .sort({
      _id: 1
    })
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

    const deviceRunningTime = await Event.aggregate([{
        $match: {
          _id: {
            $gte: mongoose.Types.ObjectId(event.id)
          },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: 2,
        },
      },
      {
        $project: {
          totalMinites: {
            $divide: [{
                  $subtract: ["$eventDateTime", "$eventStartDateTime"]
                },
                1000 * 60,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          time: {
            $sum: "$totalMinites"
          }
        },
      },
    ]);
    let totalRunningTime =
      deviceRunningTime.length > 0 ? deviceRunningTime[0].time : 1;
    averageleak = averageleak / totalRunningTime;
    averagePressure = averagePressure / totalRunningTime / 60;
    const distict = await Event.aggregate([{
        $match: {
          _id: {
            $gte: mongoose.Types.ObjectId(event.id)
          },
          deviceId: req.query.deviceId,
          email: req.query.email,
        },
      },
      {
        $project: {
          year: {
              $year: "$eventDateTime"
            },
            month: {
              $month: "$eventDateTime"
            },
            day: {
              $dayOfMonth: "$eventDateTime"
            },
        },
      },
      {
        $group: {
          _id: null,
          distinctDate: {
            $addToSet: {
              year: "$year",
              month: "$month",
              day: "$day"
            },
            },
            },
      }, {
        $sort: {
          distinctDate: 1
        },
      },
    ]);

    const runningtimByDays = await Event.aggregate([{
        $match: {
          _id: {
            $gte: mongoose.Types.ObjectId(event.id)
          },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: 2,
        },
      },
      {
        $project: {
          totalHours: {
            $divide: [{
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
            year: {
              $year: "$document.eventDateTime"
            },
            month: {
                $month: "$document.eventDateTime"
              },
              day: {
                $dayOfMonth: "$document.eventDateTime"
              },
            },
            timeSum: {
              $sum: "$totalHours"
            },
        },
      },
    ]);

    let greaterThanFour = 0,
      fourToSix = 0,
      sixToEight = 0,
      eightPlus = 0;
    const mid = Math.floor(runningtimByDays.length / 2);
    const median =
      runningtimByDays.length % 2 !== 0 ?
        runningtimByDays[mid].timeSum :
        (runningtimByDays[mid - 1].timeSum + runningtimByDays[mid].timeSum) /
        2;

    avgPressureArry.sort(function (a, b) {
      return a - b;
    });

    const percentile90Pressue = percentile(avgPressureArry, 90);
    const percentile95Pressue = percentile(avgPressureArry, 95);
    const m = Math.floor(meadianLeak.length / 2);
    const mLeakValue =
      meadianLeak.length % 2 !== 0 ?
        meadianLeak[m] :
        (meadianLeak[m - 1] + meadianLeak[m]) / 2;
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

    //meadianLeak = meadianLeak.filter((val) => val !== 0);
    meadianLeak.sort(function (a, b) {
      return a - b;
    });
    const percentileLeak = percentile(meadianLeak, 90);

    let response = {
      usage: totalRunningTime,
      averageHoursPerNight: totalRunningTime / (noofDays * 60),
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

router.get("/getAverageTime", async (req, res) => {
  let event, startDate;
  if (req.query.session == 0) {
    event = await Event.findOne({
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 1,
      })
      .sort({
        _id: -1
      })
      .catch((err) => console.error(err));
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").add(moment.duration(12, "hours")).format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").add(moment.duration(12, "hours")).format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").add(moment.duration(12, "hours")).format();
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

  if (event) {
    let averageTime = {};
    if (req.query.session == 0 || req.query.session == 1) {
      averageTime = await Event.aggregate([{
          $match: {
            _id: {
              $gte: mongoose.Types.ObjectId(event.id)
            },
            deviceId: req.query.deviceId,
            email: req.query.email,
            eventType: 2,
          },
        },
        {
          $addFields: {
            uniqueHour: {
              $dateToString: {
                format: "%H",
                date: "$eventDateTime",
              },
            },
          },
        },
        {
          $project: {
            name: 1,
            customfield: {
              $switch: {
                branches: [{
                  case: {
                    $lt: ["$uniqueHour", "12"]
                  },
                  then: {
                    $subtract: ["$eventDateTime", 43200000]
                  },
                }, ],
                default: "$eventDateTime",
              },
            },
            document: "$$ROOT",
          },
        },
        {
          $project: {
            difference: {
              $divide: [{
                  $subtract: [
                    "$document.eventDateTime",
                    "$document.eventStartDateTime",
                  ],
                },
                60 * 1000,
              ],
            },
            child: "$$ROOT",
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$child.customfield"
              },
              month: {
                $month: "$child.customfield"
              },
              day: {
                $dayOfMonth: "$child.customfield"
              },
            },
            sum: {
              $sum: "$difference"
            },
          },
        },
        {
          $sort: {
            _id: 1
          }
        },
        {
          $project: {
            date: {
              $concat: [{
                $toString: "$_id.day"
              }, "-", {
                $toString: "$_id.month"
              }, "-", {
                $toString: "$_id.year"
              }, ],
            },
            value: "$sum",
          },
        },
      ]);
    } else if (req.query.session == 2) {
      averageTime = await Event.aggregate([{
          $match: {
            _id: {
              $gte: mongoose.Types.ObjectId(event.id)
            },
            deviceId: req.query.deviceId,
            email: req.query.email,
            eventType: 2,
          },
        },
        {
          $project: {
            totalMinites: {
              $divide: [{
                  $subtract: ["$eventDateTime", "$eventStartDateTime"]
                },
                1000 * 60,
              ],
            },
            document: "$$ROOT",
          },
        },
        {
          $group: {
            _id: {
              $week: "$document.eventDateTime",
            },
            value: {
              $sum: "$totalMinites"
            },
          },
        },
        {
          $project: {
            label: "$_id.week",
            value: "$value",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);
    } else if (req.query.session == 3) {
      averageTime = await Event.aggregate([{
          $match: {
            _id: {
              $gte: mongoose.Types.ObjectId(event.id)
            },
            deviceId: req.query.deviceId,
            email: req.query.email,
            eventType: 2,
          },
        },
        {
          $project: {
            totalMinites: {
              $divide: [{
                  $subtract: ["$eventDateTime", "$eventStartDateTime"]
                },
                1000 * 60,
              ],
            },
            document: "$$ROOT",
          },
        },
        {
          $group: {
            _id: {
              $month: "$document.eventDateTime",
            },
            value: {
              $sum: "$totalMinites"
            },
          },
        },
        {
          $project: {
            value: "$value",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);
    }

    const result = formatAvarageTimeDate(averageTime, req.query.session);
    res.json({
      status: "success",
      averageTime: result,
      message: "Device found",
    });
  } else {
    res.json({
      status: "success",
      result: {
        averageTime: 0,
      },
      message: "No Data found",
    });
  }
});

router.get("/getAverageAHI", async (req, res) => {
  let event, startDate;
  if (req.query.session == 0) {
    event = await Event.findOne({
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 1,
      })
      .sort({
        _id: -1
      })
      .catch((err) => console.error(err));
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").add(moment.duration(12, "hours")).format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").add(moment.duration(12, "hours")).format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").add(moment.duration(12, "hours")).format();
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

  if (event) {
    let averageAHI = {};
    if (req.query.session == 0 || req.query.session == 1) {
      averageAHI = await Event.aggregate([{
          $match: {
            _id: {
              $gte: mongoose.Types.ObjectId(event.id)
            },
            deviceId: req.query.deviceId,
            email: req.query.email,
            eventType: {
              $in: [9, 10]
            },
          },
        },
        {
          $addFields: {
            uniqueHour: {
              $dateToString: {
                format: "%H",
                date: "$eventDateTime",
              },
            },
          },
        },
        {
          $project: {
            name: 1,
            customfield: {
              $switch: {
                branches: [{
                  case: {
                    $lt: ["$uniqueHour", "12"]
                  },
                  then: {
                    $subtract: ["$eventDateTime", 43200000]
                  },
                }, ],
                default: "$eventDateTime",
              },
            },
            document: "$$ROOT",
          },
        },
        {
          $group: {
            _id: {
              year: {
                $year: "$customfield"
              },
              month: {
                $month: "$customfield"
              },
              day: {
                $dayOfMonth: "$customfield"
              },
            },
            value: {
              $sum: 1
            },
          },
        },
        {
          $sort: {
            _id: 1
          }
        },
        {
          $project: {
            date: {
              $concat: [{
                $toString: "$_id.day"
              }, "-", {
                $toString: "$_id.month"
              }, "-", {
                $toString: "$_id.year"
              }, ],
            },
            value: "$value",
          },
        },
      ]);
    } else if (req.query.session == 2) {
      averageAHI = await Event.aggregate([{
          $match: {
            _id: {
              $gte: mongoose.Types.ObjectId(event.id)
            },
            deviceId: req.query.deviceId,
            email: req.query.email,
            eventType: {
              $in: [9, 10]
            },
          },
        },
        {
          $group: {
            _id: {
              $week: "$eventDateTime",
            },
            value: {
              $sum: 1
            },
          },
        },
        {
          $project: {
            label: "$_id.week",
            value: "$value",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);
    } else if (req.query.session == 3) {
      averageAHI = await Event.aggregate([{
        $match: {
          _id: {
            $gte: mongoose.Types.ObjectId(event.id)
          },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: {
            $in: [9, 10]
          },
        },
      }, {
        $group: {
          _id: {
            $month: "$eventDateTime",
          },
          value: {
            $sum: 1
          },
        },
      }, {
        $project: {
          value: "$value",
        },
      }, {
        $sort: {
          _id: 1,
        },
      }, ]);
    }
    const result = formatAvarageTimeDate(averageAHI, req.query.session);
    res.json({
      status: "success",
      averageAHI: result,
      message: "Device found",
    });
  } else {
    res.json({
      status: "success",
      averageAHI: [],
      message: "No Data found",
    });
  }
});

router.get("/getAverageLeak", async (req, res) => {
  let event, startDate;
  if (req.query.session == 0) {
    event = await Event.findOne({
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 1,
      })
      .sort({
        _id: -1
      })
      .catch((err) => console.error(err));
  } else if (req.query.session == 1) {
    startDate = moment().subtract(90, "d").startOf("day").format();
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

  if (event) {
    const averageLeak = await Event.aggregate([{
        $match: {
          _id: {
            $gte: mongoose.Types.ObjectId(event.id)
          },
          deviceId: req.query.deviceId,
          email: req.query.email,
          eventType: {
            $in: [1, 22, 2]
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    let dailyAverage = [];
    for (let x of averageLeak) {
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
      }
    }
    res.json({
      status: "success",
      result: {
        averageLeak: averageLeak,
      },
      message: "Device found",
    });
  } else {
    res.json({
      status: "success",
      result: {
        averageTime: 0,
      },
      message: "No Data found",
    });
  }
});

const getAverageHorsPerNight = function (eventData, map) {
  let startDate = moment(+eventData.eventStartDateTime).format("DD-MM-YYYY");
  let endDate = moment(+eventData.eventDateTime).format("DD-MM-YYYY");

  if (startDate == endDate) {
    let timeDiff =
      moment(eventData.eventDateTime).valueOf() -
      moment(eventData.eventStartDateTime).valueOf();
    if (map.has(startDate)) {
      map.set(startDate, map.get(startDate) + timeDiff / (1000 * 60 * 60));
    } else {
      map.set(startDate, timeDiff / (1000 * 60 * 60));
    }
  } else {
    let timeDiffA =
      moment(eventData.eventStartDateTime).endOf("day").valueOf() -
      moment(eventData.eventStartDateTime).valueOf();

    let timeDiffB =
      moment(eventData.eventDateTime).valueOf() -
      moment(eventData.eventDateTime).startOf("day").valueOf();
    if (map.has(startDate)) {
      map.set(startDate, map.get(startDate) + timeDiffA / (1000 * 60 * 60));
    } else {
      map.set(startDate, timeDiffA / (1000 * 60 * 60));
    }
    if (map.has(endDate)) {
      map.set(endDate, map.get(endDate) + timeDiffB / (1000 * 60 * 60));
    } else {
      map.set(endDate, timeDiffB / (1000 * 60 * 60));
    }
  }
  return map;
};

function getDates(session) {
  let result = [];
  let list = [];
  if (session == 1) {
    var currentDate = moment().subtract(7, "d").startOf("day").format();
    arraylength = 7;
    current = 0;
    for (let x = 0; x < arraylength; x++) {
      const data = {
        label: "",
        value: 0
      };
      data.label = moment(currentDate).format("D-M-YYYY");
      currentDate = moment(currentDate).add(1, "d");
      result.push(data);
      list.push(data.label);
    }
  }
  return [list, result];
}

function getWeek() {
  let result = [];
  let list = [];
  var currentWeek = moment().week();
  arraylength = 4;
  current = 0;
  for (let x = arraylength; x >= 0; x--) {
    const data = {
      label: currentWeek - x,
      value: 0
    };
    result.push(data);
    list.push(currentWeek - x);
  }
  return [list, result];
}

function getMonths() {
  let result = [];
  let list = [];
  var currentMonth = moment().month() + 1;

  for (let x = 0; x < 4; x++) {
    const data = {
      label: currentMonth - x,
      value: 0
    };
    result.push(data);
    list.push(currentMonth - x);
  }
  return [list, result];
}

const formatAvarageTimeDate = function (averageTime, session) {
  if (session == 0) {
    let result = [];
    for (const [key, v] of averageTime.entries()) {
      const data = {
        label: 1,
        value: v.value
      };
      result.push(data);
    }
    return result;
  } else if (session == 1) {
    myList = getDates(session);
    let result = myList[1];
    for (const [key, v] of averageTime.entries()) {
      if (myList[0].indexOf(v.date) >= 0) {
        result[myList[0].indexOf(v.date)].value = v.value;
      }
    }
    return myList[1];
  } else if (session == 2) {
    myList = getWeek(session);
    let result = myList[1];
    for (const [key, v] of averageTime.entries()) {
      if (myList[0].indexOf(v._id) >= 0) {
        result[myList[0].indexOf(v._id)].value = v.value;
      }
    }
    return myList[1];
  } else if (session == 3) {
    myList = getMonths(session);
    let result = myList[1];
    for (const [key, v] of averageTime.entries()) {
      if (myList[0].indexOf(v._id) >= 0) {
        result[myList[0].indexOf(v._id)].value = v.value;
      }
    }
    return myList[1];
  }
};

router.get("/reportBySession", async (req, res) => {
  let notUseddays = 0;
  let event, startDate;
  if (req.query.session == 0) {
    notUseddays = 1;
    event = await Event.findOne({
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 1,
      })
      .sort({
        _id: -1
      })
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
  if (event) {
    eventList = await Event.find({
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: {
          $in: [1, 24, 2]
        },
        _id: {
          $gte: event.id
        },
      })
      .sort({
        _id: 1
      })
      .catch((err) => console.error(err));
  }

  let subData;
  let lastPressureTtime;
  let eventPressure = 0;
  let averagePressure = 0;
  let changeEventPresent = false;
  let avgPArray = [];
  let pressureCount = 0;
  let map = new Map();
  for (let x of eventList) {
    if (x.eventType == 1) {
      subData = x.subData / 10;
    } else if (x.eventType == 24) {
      changeEventPresent = true;
      if (!lastPressureTtime) {
        lastPressureTtime = moment(x.eventStartDateTime).valueOf();
      }
      const avgPressure =
        (moment(x.eventDateTime).valueOf() - lastPressureTtime) / 1000 / 60;
      eventPressure += avgPressure * subData;
      lastPressureTtime = moment(x.eventDateTime).valueOf();
      subData = x.subData / 10;
    } else if (x.eventType == 2) {
      if (changeEventPresent) {
        changeEventPresent = false;
        const avgPressure =
          (moment(x.eventDateTime).valueOf() - lastPressureTtime) / 1000 / 60;
        eventPressure += avgPressure * subData;
        pressureCount++;
        let sesionp =
          eventPressure /
          ((moment(x.eventDateTime).valueOf() -
              moment(x.eventStartDateTime).valueOf()) /
            1000 /
            60);
        (sesionp = Math.round(sesionp * 100) / 100), avgPArray.push(sesionp);
        averagePressure += sesionp;
        lastPressureTtime = null;
        subData = null;
        eventPressure = 0;
      }
      getAverageHorsPerNight(x, map);
    }
  }
  map.forEach((k, v) => {
    console.log(k, "===", v);
  });
  let sum = 0,
    greaterThanFour = 0,
    fourToSix = 0,
    sixToEight = 0,
    eightPlus = 0;
  map.forEach((v) => {
    sum += v;
    if (v > 4 && v <= 6) {
      fourToSix++;
      greaterThanFour++;
    } else if (v > 6 && v <= 8) {
      sixToEight++;
      greaterThanFour++;
    } else if (v > 8) {
      eightPlus++;
      greaterThanFour++;
    }
  });

  avgPArray.sort(function (a, b) {
    return a - b;
  });
  let nintyFivePercentilePressure = percentile(avgPArray, 95);

  const apneaArray = await Event.aggregate([{
      $match: {
        _id: {
          $gte: mongoose.Types.ObjectId(event.id)
        },
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 9,
      },
    },
    {
      $count: "apneaCount",
    },
  ]);
  let apnea = apneaArray.length > 0 ? apneaArray[0].apneaCount : 0;
  const hypopneaArray = await Event.aggregate([{
      $match: {
        _id: {
          $gte: mongoose.Types.ObjectId(event.id)
        },
        deviceId: req.query.deviceId,
        email: req.query.email,
        eventType: 10,
      },
    },
    {
      $count: "hypopneaCount",
    },
  ]);
  let hypopnea = hypopneaArray.length > 0 ? hypopneaArray[0].hypopneaCount : 0;
  let totalTime = Math.round(sum * 100) / 100;
  let noofDays = map.size;
  let response = {
    usage: totalTime,
    notUsed: notUseddays - noofDays,
    averageHoursPerNight: Math.round((totalTime / noofDays) * 100) / 100,
    greaterThanFour: greaterThanFour,
    fourToSix: fourToSix,
    sixToEight: sixToEight,
    eightPlus: eightPlus,
    apnea: Math.round((apnea / totalTime) * 100) / 100,
    hypopnea: Math.round((hypopnea / totalTime) * 100) / 100,
    AHI: Math.round(((apnea + hypopnea) / totalTime) * 100) / 100,
    averagePressure: Math.round((averagePressure / pressureCount) * 100) / 100,
    nintyFivePercentilePressure: nintyFivePercentilePressure,
  };

  res.json({
    status: "success",
    result: response,
    message: "Event Data found",
  });
  // } else {
  //   res.json({
  //     status: "success",
  //     result: 0,
  //     message: "No Event Data found",
  //   });
  // }
});

module.exports = router;