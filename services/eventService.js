const express = require("express");
const router = require("express").Router();
const Event = require("./../model/event");
const Parameter = require("./../model/parameter");
const eventService = express();
var hexToBinary = require("hex-to-binary");
const mongoose = require("mongoose");
const moment = require("moment");
const emailTemplate = require("./register.js")
const logger = require('./../logger/customlogger');
var pdf = require('html-pdf');

const options = {
  format: 'A4',
  base: "https://cryptic-caverns-35875.herokuapp.com/"
}

const arrayAverage = (array) => array.reduce((a, b) => a + b) / array.length;

eventService.use(express.json({
  extended: false,
  limit: '50mb'
}))
eventService.use(express.urlencoded({
  limit: '50mb',
  extended: false,
  parameterLimit: 50000
}))


function hexadecimalConversion(hexString) {
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

async function dateConversion(hexString, email, deviceId) {
  const array = hexString.match(/.{1,10}/g);
  var startDateTime;
  let allEventData = [];
  for (let x of array) {
    let twodigitArray = x.match(/.{1,2}/g);
    if (twodigitArray.length == 5) {
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
      allEventData.push(body);
    } else {
      throw "Event data format is incorrect ";
    }
  }
  return allEventData;
};

router.post("/save", async (req, res) => {
  logger.info("save -- " + req.body.email);
  try {
    let device = req.body.event;
    if (device) {
      await Event.deleteMany({
        email: req.body.email,
        deviceId: req.body.deviceId,
      });
    }
    device = device.replace(/\s/g, "").replace(/,/g, "");
    const allEventData = await dateConversion(device, req.body.email, req.body.deviceId);
    Event.insertMany(allEventData).then(
      res.json({
        status: "success",
        result: "",
        message: "Event Data saved",
      })
    ).catch(err => {
      throw "Event data saving failed";
    });
  } catch (e) {
    logger.error("save -- " + req.body.email+"--"+ e);
    res.status(500).json({
      status: "Failure",
      result: e,
      message: "event saving failed",
    });
  }
});



async function getAverageHorsPerNight(eventData, req) {
  let timseResponse = await Event.aggregate([{
    $match: {
      deviceId: req.query.deviceId,
      email: req.query.email,
      _id: {
        $gt: mongoose.Types.ObjectId(eventData.id)
      },
      eventType: 2
    },
  }, {
    $addFields: {
      uniqueHour: {
        $dateToString: {
          format: "%H",
          date: "$eventStartDateTime",
        },
      },
    }
  }, {
    $project: {
      name: 1,
      customfield: {
        $switch: {
          branches: [{
            case: {
              $lt: ["$uniqueHour", "12"]
            },
            then: {
              $subtract: ["$eventStartDateTime", 43200000]
            },
          }, ],
          default: "$eventStartDateTime",
        },
      },
      document: "$$ROOT",
    },
  }, {
    $project: {
      difference: {
        $divide: [{
            $subtract: [
              "$document.eventDateTime",
              "$document.eventStartDateTime",
            ],
          },
          1000 * 60 * 60,
        ],
      },
      parent: "$$ROOT",
    }
  }, {
    $project: {
      result: {
        $round: [{
          $add: ['$difference', 0.000000001]
        }, 2]
      },
      child: "$$ROOT",
    }
  }, {
    $group: {
      _id: {
        year: {
          $year: "$child.parent.customfield"
        },
        month: {
          $month: "$child.parent.customfield"
        },
        day: {
          $dayOfMonth: "$child.parent.customfield"
        },
      },
      sum: {
        $sum: "$result"
      },
    },
  }, ]).catch((err) => console.error(err));
  return timseResponse;
};

async function getMinAndMaxPressure(eventData, req) {
  let pressureResponse = await Event.aggregate([{
    $match: {
      deviceId: req.query.deviceId,
      email: req.query.email,

    }
  }, {
    $group: {
      "_id": "$eventType",
      "pressure": {
        "$max": "$subData"
      },
    },
  }, {
    $sort: {
      _id: 1
    }
  }]).catch((err) => console.error(err));
  return pressureResponse;
};

function getDates(session) {
  let result = [];
  let list = [];
  if (session == 1) {
    var currentDate = moment().subtract(7, "d").startOf("day").add(12, "h").format();
    arraylength = 7;
    current = 0;
    for (let x = 0; x < arraylength; x++) {
      const data = {
        label: "",
        value: 0
      };
      data.label = moment(currentDate).format("MM-DD-YYYY");
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
  arraylength = 4;
  current = 0;
  for (let x = 1; x <= arraylength; x++) {
    const data = {
      label: "Week " + x,
      value: 0
    };
    result.push(data);
    list.push(x);
  }
  return [list, result];
}

async function getWeeklyData(deviceId, email) {
  let result = [];
  for (let x = 1; x < 5; x++) {
    let startDate = moment().subtract(7 * x, "d").startOf("day").add(12, "h").format();
    let endDate = moment().subtract(7 * (x - 1), "d").startOf("day").add(12, "h").format();
    const averageTime = await Event.aggregate([{
        $match: {
          deviceId: deviceId,
          email: email,
          eventType: 2,
          $and: [{
              eventStartDateTime: {
                $gte: new Date(startDate)
              }
            },
            {
              eventStartDateTime: {
                $lt: new Date(endDate)
              }
            }
          ],
        }
      },
      {
        $project: {
          totalMinites: {
            $divide: [{
                $subtract: ["$eventDateTime", "$eventStartDateTime"]
              },
              1000 * 60 * 60,
            ],
          },
        },
      }, {
        $group: {
          _id: 1,
          value: {
            $sum: "$totalMinites"
          },
        }
      }
    ]).catch((err) => console.error(err));
    if (averageTime.length > 0) {
      let totalTime = Math.round(averageTime[0].value * 100) / 100;
      const data = {
        label: "Week " + (5 - x),
        value: totalTime
      };
      result.push(data);
    } else {
      const data = {
        label: "Week " + (5 - x),
        value: 0
      };
      result.push(data);
    }

  }
  return result;
}

async function getMonthlyData(deviceId, email) {
  let result = [];
  for (let x = 1; x < 4; x++) {
    let startDate = moment().subtract(30 * x, "d").startOf("day").add(12, "h").format();
    let endDate = moment().subtract(30 * (x - 1), "d").startOf("day").add(12, "h").format();
    const averageTime = await Event.aggregate([{
        $match: {
          deviceId: deviceId,
          email: email,
          eventType: 2,
          $and: [{
              eventStartDateTime: {
                $gte: new Date(startDate)
              }
            },
            {
              eventStartDateTime: {
                $lt: new Date(endDate)
              }
            }
          ],
        }
      },
      {
        $project: {
          totalMinites: {
            $divide: [{
                $subtract: ["$eventDateTime", "$eventStartDateTime"]
              },
              1000 * 60 * 60,
            ],
          },
        },
      }, {
        $group: {
          _id: 1,
          value: {
            $sum: "$totalMinites"
          },
        }
      }
    ]).catch((err) => console.error(err));
    if (averageTime.length > 0) {
      let totalTime = Math.round(averageTime[0].value * 100) / 100;
      const data = {
        label: "Month " + (4 - x),
        value: totalTime
      };
      result.push(data);
    } else {
      const data = {
        label: "Month " + (4 - x),
        value: 0
      };
      result.push(data);
    }

  }
  return result;
}

function getMonths() {
  let result = [];
  let list = [];
  for (let x = 1; x < 4; x++) {
    const data = {
      label: "Month " + x,
      value: 0
    };
    result.push(data);
    list.push(x);
  }
  return [list, result];
}

const formatAvarageTimeDate = function (averageTime, session) {
  if (session == 0) {
    let result = [];
    const data = {
      label: moment().subtract(1, "d").format("MM-DD-YYYY"),
      value: 0
    };
    if (averageTime) {
      for (const [key, v] of averageTime.entries()) {
        data.label = v.date;
        data.value = v.value;
      }
    }
    result.push(data);
    return result;
  } else if (session == 1) {
    myList = getDates(session);
    let result = myList[1];
    if (averageTime) {
      for (const [key, v] of averageTime.entries()) {
        const varDate = moment(v.date, "D-M-YYYY").format('MM-DD-YYYY');
        if (myList[0].indexOf(varDate) >= 0) {
          result[myList[0].indexOf(varDate)].value = v.value;
        }
      }
    }
    return myList[1];
  } else if (session == 2) {
    myList = getWeek(session);
    let result = myList[1];
    if (averageTime) {
      for (const [key, v] of averageTime.entries()) {
        console.log(moment(+v._id).format());
        if (myList[0].indexOf(v._id) >= 0) {
          result[myList[0].indexOf(v._id)].value = v.value;
        }
      }
    }
    return myList[1];
  } else if (session == 3) {
    myList = getMonths(session);
    let result = myList[1];
    if (averageTime) {
      for (const [key, v] of averageTime.entries()) {
        if (myList[0].indexOf(v._id) >= 0) {
          result[myList[0].indexOf(v._id)].value = v.value;
        }
      }
    }
    return myList[1];
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
  logger.info("getEventDataBySession -- " + req.query.email);
  let event, startDate;
  if (req.query.session == 0) {
    startDate = moment().subtract(1, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(33, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 4) {
    startDate = moment().subtract(365, "d").startOf("day").add(12, "h").format();
  }
  let events = null;

  events = await Event.find({
    deviceId: req.query.deviceId,
    email: req.query.email,
    eventType: {
      $in: [2, 9, 10, 22]
    },
    eventStartDateTime: {
      $gte: new Date(startDate)
    }
  }).sort({
    _id: 1
  }).catch((err) => {
    logger.error("getEventDataBySession -- " + req.query.email + err);
    console.error(err)
  });

  if (events && events.length > 0) {
    let lastLeakTtime;
    let lastLeakData;
    let totalrunningTime = 0;
    let totalAvergaeLeak = 0;
    let averageleak = 0;
    let apneaIndex = 0;
    for (let x of events) {
      if (x.eventType === 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime);
        }
        const avgtime = moment(x.eventDateTime).diff(lastLeakTtime, 'minutes');
        lastLeakData = x.subData;
        averageleak += avgtime * x.subData;
        lastLeakTtime = moment(x.eventDateTime);
      } else if (x.eventType === 2) {

        let status = moment(x.eventDateTime).diff(moment(x.eventStartDateTime), 'minutes');
        totalrunningTime += status;
        const avgtime = moment(x.eventDateTime).diff(lastLeakTtime, 'minutes');
        averageleak += avgtime * lastLeakData;
        totalAvergaeLeak += averageleak;
        averageleak = null;
        lastLeakTtime = null;
      } else if (x.eventType === 10 || x.eventType === 9) {
        apneaIndex++;
      }
    }

    if (totalrunningTime > 0) {
      totalAvergaeLeak = Math.round((totalAvergaeLeak / totalrunningTime) * 100) / 100;
      totalrunningTime = totalrunningTime / 60;
      let totalTime2 = (totalrunningTime > 0) ? Math.round(totalrunningTime * 100) / 100 : 1;
      apneaIndex = Math.round((apneaIndex / totalTime2) * 100) / 100
    }
    res.json({
      status: "success",
      result: {
        usageHours: totalrunningTime,
        avgLeak: totalAvergaeLeak,
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
    startDate = moment().subtract(1, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 1) {
    notUseddays = 7;
    startDate = moment().subtract(7, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 2) {
    notUseddays = 30;
    startDate = moment().subtract(30, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 3) {
    notUseddays = 90;
    startDate = moment().subtract(90, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 4) {
    notUseddays = 365;
    startDate = moment().subtract(365, "d").startOf("day").add(12, "h").format();
  }
  let eventList = null;

  eventList = await Event.find({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: {
        $in: [1, 22, 24, 2]
      },
      eventStartDateTime: {
        $gte: new Date(startDate)
      }
    })
    .sort({
      _id: 1
    }).catch((err) => console.error(err));

  if (eventList && eventList.length > 0) {
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
    event = eventList[0];
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

    avgPressureArry.sort(function (a, b) {
      return a - b;
    });

    const percentile90Pressue = percentile(avgPressureArry, 90);
    const percentile95Pressue = percentile(avgPressureArry, 95);

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
      medianHoursPerNight: 0,
      noofDays: noofDays,
      notUsed: notUseddays,
      averageleak: averageleak,
      meadianLeak: 0,
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
  let result;
  if (req.query.session == 0) {
    startDate = moment().subtract(1, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").add(12, 'h').format();
  }

  event = await Event.findOne({
    deviceId: req.query.deviceId,
    email: req.query.email,
    eventType: 1,
    eventStartDateTime: {
      $gte: new Date(startDate),
    },
  }).catch((err) => console.error(err));

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
                1000 * 60 * 60,
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
      result = formatAvarageTimeDate(averageTime, req.query.session);
    } else if (req.query.session == 2) {
      result = await getWeeklyData(req.query.deviceId, req.query.email)
    } else if (req.query.session == 3) {
      result = await getMonthlyData(req.query.deviceId, req.query.email)
    }
    res.json({
      status: "success",
      result: result,
      message: "Device found",
    });
  } else {
    result = formatAvarageTimeDate(null, req.query.session);
    res.json({
      status: "success",
      result: result,
      message: "No Data found",
    });
  }
});

router.get("/getAverageAHI", async (req, res) => {
  let event, startDate;
  if (req.query.session == 0) {
    startDate = moment().subtract(1, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 1) {
    startDate = moment().subtract(7, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").add(12, 'h').format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").add(12, 'h').format();
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
    startDate = moment().subtract(7, "d").startOf("day").format();
  } else if (req.query.session == 2) {
    startDate = moment().subtract(30, "d").startOf("day").format();
  } else if (req.query.session == 3) {
    startDate = moment().subtract(90, "d").startOf("day").format();
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

router.get("/reportBySession", async (req, res) => {
  logger.info("reportBySession -- " + req.query.email);
  let notUseddays = 0;
  let datesOfReport;
  let event, startDate;
  if (req.query.session == 0) {
    notUseddays = 1;
    startDate = moment().subtract(1, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 1) {
    notUseddays = 7;
    startDate = moment().subtract(7, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 2) {
    notUseddays = 30;
    startDate = moment().subtract(33, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 3) {
    notUseddays = 90;
    startDate = moment().subtract(90, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 4) {
    notUseddays = 365;
    startDate = moment().subtract(365, "d").startOf("day").add(12, "h").format();
  }
  let eventList = null;

  datesOfReport = moment(startDate).format("MM-DD-YYYY") + " to " + moment().format("MM-DD-YYYY");
  eventList = await Event.find({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: {
        $in: [1, 11, 22, 23, 24, 25, 26, 27, 2]
      },
      eventStartDateTime: {
        $gte: new Date(startDate)
      }
    })
    .sort({
      _id: 1
    })
    .catch((err) => {
      logger.error("reportBySession -- " + req.query.email + err);
      console.error(err)
    });

  if (eventList && eventList.length > 0) {
    let subData;
    let lastPressureTtime;
    let lastLeakTtime;
    let eventPressure = 0;
    let eventAvgLeak = 0;
    let averagePressure = 0;
    let averageLeak = 0;
    let lastLeakEventData = 0;
    let avgLeakEventArray = [];
    let avgPArray = [];

    for (let x of eventList) {
      if (x.eventType == 1) {
        subData = x.subData / 10;
        avgLeakEventArray.push(x.subData);
        avgPArray.push(x.subData);
      } else if (x.eventType == 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime);
        }
        const avgLeak = moment(x.eventDateTime).diff(lastLeakTtime, 'minutes');
        eventAvgLeak += avgLeak * x.subData;
        lastLeakTtime = x.eventDateTime;
        lastLeakEventData = x.subData;
        avgLeakEventArray.push(x.subData);
      } else if (x.eventType == 11 || x.eventType == 23 || x.eventType == 24 || x.eventType == 25 || x.eventType == 26 || x.eventType == 27) {
        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime);
        }
        const avgPressure = moment(x.eventDateTime).diff(lastPressureTtime, 'minutes')
        eventPressure += avgPressure * subData;
        lastPressureTtime = x.eventDateTime;
        subData = x.subData / 10;
        avgPArray.push(x.subData);
      } else if (x.eventType == 2) {
        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime);
        }
        const avgPressure = moment(x.eventDateTime).diff(lastPressureTtime, 'minutes');

        eventPressure += avgPressure * subData;
        avgPArray.push(x.subData);
        averagePressure += eventPressure;
        lastPressureTtime = null;
        subData = null;
        eventPressure = 0;
        avgLeakEventArray.push(x.subData);
        const avgLeak = moment.duration(moment(x.eventDateTime).diff(lastLeakTtime)).minutes();
        eventAvgLeak += avgLeak * lastLeakEventData;
        averageLeak += eventAvgLeak;
        lastLeakTtime = null;
        eventAvgLeak = 0;
      }
    }

    if (event == null || event == 'undefined')
      event = eventList[0];
    const dailyList = await getAverageHorsPerNight(event, req);

    const deviceParams = await Parameter.findOne({
      deviceId: req.query.deviceId,
      email: req.query.email,
    }).lean();

    let sum = 0,
      greaterThanFour = 0,
      greaterThanSix = 0;
    dailyList.forEach((v) => {
      sum += v.sum;
      if (v.sum > 4) {
        greaterThanFour++;
      }
      if (v.sum > 6) {
        greaterThanSix++;
      }
    });
    avgLeakEventArray.sort(function (a, b) {
      return a - b;
    });
    avgPArray.sort(function (a, b) {
      return a - b;
    });

    let nintyFivePercentilePressure = percentile(avgPArray, 95);
    let nintyFivePercentileLeak = percentile(avgLeakEventArray, 95);

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
    let totalTime = (sum > 0) ? Math.round(sum * 100) / 100 : 0;
    let totalTime2 = (sum > 0) ? Math.round(sum * 100) / 100 : 1;
    let noofDays = dailyList.length;
    let response = {
      datesOfReport: datesOfReport,
      usage: totalTime,
      noofDays: noofDays,
      notUsed: notUseddays - noofDays,
      averageHoursPerNight: Math.round((totalTime / noofDays) * 100) / 100,
      greaterThanFour: greaterThanFour,
      greaterThanSix: greaterThanSix,
      apnea: Math.round((apnea / totalTime2) * 100) / 100,
      hypopnea: Math.round((hypopnea / totalTime2) * 100) / 100,
      AHI: Math.round(((apnea + hypopnea) / totalTime2) * 100) / 100,
      minPressure: deviceParams.minimumPressure,
      maxPressure: deviceParams.maximumPressure,
      averagePressure: Math.round((averagePressure / (totalTime2 * 60)) * 100) / 100,
      nintyFivePercentilePressure: nintyFivePercentilePressure / 10,
      averageLeak: Math.round((averageLeak / (totalTime2 * 60)) * 100) / 100,
      nintyFivePercentileLeak: nintyFivePercentileLeak,
    };

    res.json({
      status: "success",
      result: response,
      message: "Event Data found",
    });
  } else {
    res.json({
      status: "success",
      result: {
        datesOfReport: datesOfReport,
        usage: 0,
        noofDays: 0,
        notUsed: 0,
        averageHoursPerNight: 0,
        greaterThanFour: 0,
        greaterThanSix: 0,
        apnea: 0,
        hypopnea: 0,
        AHI: 0,
        minPressure: 0,
        maxPressure: 0,
        averagePressure: 0,
        nintyFivePercentilePressure: 0,
        averageLeak: 0,
        nintyFivePercentileLeak: 0,
      },
      message: "No Event Data found",
    });
  }
});

router.get("/genaratePdf", async (req, res) => {

  let notUseddays = 0;
  let datesOfReport;
  let event, startDate, response;
  if (req.query.session == 0) {
    notUseddays = 1;
    startDate = moment().subtract(1, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 1) {
    notUseddays = 7;
    startDate = moment().subtract(7, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 2) {
    notUseddays = 30;
    startDate = moment().subtract(30, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 3) {
    notUseddays = 90;
    startDate = moment().subtract(90, "d").startOf("day").add(12, "h").format();
  } else if (req.query.session == 4) {
    notUseddays = 365;
    startDate = moment().subtract(365, "d").startOf("day").add(12, "h").format();
  }
  let eventList = null;

  datesOfReport = moment(startDate).format("MM-DD-YYYY") + " to " + moment().format("MM-DD-YYYY");
  eventList = await Event.find({
      deviceId: req.query.deviceId,
      email: req.query.email,
      eventType: {
        $in: [1, 11, 22, 23, 24, 25, 26, 27, 2]
      },
      eventStartDateTime: {
        $gte: new Date(startDate)
      }
    })
    .sort({
      _id: 1
    })
    .catch((err) => console.error(err));

  const params = await Parameter.findOne({
    deviceId: req.query.deviceId,
    email: req.query.email,
  }).lean();
  if (eventList && eventList.length > 0) {
    let subData;
    let lastPressureTtime;
    let lastLeakTtime;
    let eventPressure = 0;
    let eventAvgLeak = 0;
    let averagePressure = 0;
    let averageLeak = 0;
    let lastLeakEventData = 0;
    let avgLeakEventArray = [];
    let avgPArray = [];
    for (let x of eventList) {
      if (x.eventType == 1) {
        subData = x.subData / 10;
        avgLeakEventArray.push(x.subData);
        avgPArray.push(x.subData);
      } else if (x.eventType == 22) {
        if (!lastLeakTtime) {
          lastLeakTtime = moment(x.eventStartDateTime);
        }
        const avgLeak = moment(x.eventDateTime).diff(lastLeakTtime, 'minutes');
        eventAvgLeak += avgLeak * x.subData;
        lastLeakTtime = x.eventDateTime;
        lastLeakEventData = x.subData;
        avgLeakEventArray.push(x.subData);
      } else if (x.eventType == 11 || x.eventType == 23 || x.eventType == 24 || x.eventType == 25 || x.eventType == 26 || x.eventType == 27) {
        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime);
        }
        const avgPressure = moment(x.eventDateTime).diff(lastPressureTtime, 'minutes')
        eventPressure += avgPressure * subData;
        lastPressureTtime = x.eventDateTime;
        subData = x.subData / 10;
        avgPArray.push(x.subData);
      } else if (x.eventType == 2) {
        if (!lastPressureTtime) {
          lastPressureTtime = moment(x.eventStartDateTime);
        }
        const avgPressure = moment(x.eventDateTime).diff(lastPressureTtime, 'minutes');
        eventPressure += avgPressure * subData;
        avgPArray.push(x.subData);
        averagePressure += eventPressure;
        lastPressureTtime = null;
        subData = null;
        eventPressure = 0;
        pressureChangeEventExists = false;
        avgLeakEventArray.push(x.subData);
        const avgLeak = moment.duration(moment(x.eventDateTime).diff(lastLeakTtime)).minutes();
        eventAvgLeak += avgLeak * lastLeakEventData;
        averageLeak += eventAvgLeak;
        lastLeakTtime = null;
        eventAvgLeak = 0;
      }
    }

    if (event == null || event == 'undefined')
      event = eventList[0];
    const dailyList = await getAverageHorsPerNight(event, req);

    let sum = 0,
      greaterThanFour = 0,
      greaterThanSix = 0;
    dailyList.forEach((v) => {
      sum += v.sum;
      if (v.sum > 4) {
        greaterThanFour++;
      }
      if (v.sum > 6) {
        greaterThanSix++;
      }
    });
    avgLeakEventArray.sort(function (a, b) {
      return a - b;
    });
    avgPArray.sort(function (a, b) {
      return a - b;
    });

    let nintyFivePercentilePressure = percentile(avgPArray, 95);
    let nintyFivePercentileLeak = percentile(avgLeakEventArray, 95);

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
    let totalTime = (sum > 0) ? Math.round(sum * 100) / 100 : 0;
    let totalTime2 = (sum > 0) ? Math.round(sum * 100) / 100 : 1;
    let noofDays = dailyList.length;
    response = {
      session: notUseddays == 0 ? "Last Session" : notUseddays + " Days",
      datesOfReport: datesOfReport,
      usage: totalTime,
      noofDays: noofDays + "of " + notUseddays + " Days (" + Math.round((noofDays * 100 / notUseddays) * 100) / 100 + "%)",
      days: notUseddays,
      averageHoursPerNight: Math.round((totalTime / noofDays) * 100) / 100,
      greaterThanFour: greaterThanFour + "of " + notUseddays + " Days (" + Math.round((greaterThanFour * 100 / notUseddays) * 100) / 100 + "%)",
      greaterThanSix: greaterThanSix + "of " + notUseddays + " Days (" + Math.round((greaterThanSix * 100 / notUseddays) * 100) / 100 + "%)",
      apnea: Math.round((apnea / totalTime2) * 100) / 100,
      hypopnea: Math.round((hypopnea / totalTime2) * 100) / 100,
      AHI: Math.round(((apnea + hypopnea) / totalTime2) * 100) / 100,
      minPressure: params.minimumPressure,
      maxPressure: params.maximumPressure,
      averagePressure: Math.round((averagePressure / (totalTime2 * 60)) * 100) / 100,
      nintyFivePercentilePressure: nintyFivePercentilePressure / 10,
      averageLeak: Math.round((averageLeak / (totalTime2 * 60)) * 100) / 100,
      nintyFivePercentileLeak: nintyFivePercentileLeak,
      name: req.query.name,
      deviceId: req.query.deviceId,
      email: req.query.email,
      startPressure: params.startingPressure,
      risePressure: params.startingRampPressure,
      riseDuration: params.rampDuration,
      air: params.EZEX,
    };

  } else {
    response = {
      session: notUseddays == 0 ? "Last Session" : notUseddays + " Days",
      datesOfReport: datesOfReport,
      usage: 0,
      noofDays: 0,
      notUsed: 0,
      averageHoursPerNight: 0,
      greaterThanFour: 0,
      greaterThanSix: 0,
      apnea: 0,
      hypopnea: 0,
      AHI: 0,
      minPressure: params != null ? params.minimumPressure : 0,
      maxPressure: params != null ? params.maximumPressure : 0,
      averagePressure: 0,
      nintyFivePercentilePressure: 0,
      averageLeak: 0,
      nintyFivePercentileLeak: 0,
      name: req.query.name,
      deviceId: req.query.deviceId,
      email: req.query.email,
      startPressure: params != null ? params.startingPressure : 0,
      risePressure: params != null ? params.startingRampPressure : 0,
      riseDuration: params != null ? params.rampDuration : 0,
      air: params != null ? params.EZEX : 0,
    }
  }
  let htmlStr = emailTemplate.pdfreport(response);
  let name = req.query.name.replace(/ /g, '');
  pdf.create(htmlStr, options).toFile(name + '.pdf', function (err, res2) {
    if (err) {
      res.status(500).send({
        status: "failure"
      });
    }
    res.send({
      status: "success",
      result: name + ".pdf"
    });
  })
});



module.exports = router;