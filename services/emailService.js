const express = require("express");
const nodeMailer = require("nodemailer");
const speakeasy = require("speakeasy");
const emailService = express();
emailService.use(express.json());
const emailTemplate = require("./register.js")
var path = require('path')


let map = new Map();

const mailCredentials = {
  host: "smtp.office365.com",
  port: 587,
  secureConnection: false,
  tls: {
    ciphers: 'SSLv3'
  },
  auth: {
    user: "appsupport@mytranscend.com",
    pass: "dr4TlDFHmN",
  }
}

module.exports.sendEmail = function (toEmail) {
  var transporter = nodeMailer.createTransport(mailCredentials);

  var mailOptions = {
    from: "appsupport@mytranscend.com",
    to: toEmail,
    subject: "Sending Email TO Verify",
    text: "Dear Sir / Madam, \r\nYour One Time Password(OTP) is :" +
      this.generateOtp(toEmail) +
      "\r\nYour OTP will expire in 5 min. \r\n\r\n\r\n\r\n\r\nDo not share your OTP with anyone including your Depository Participant (DP).",
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
      //res.send("email Sent");
    }
  });
};

module.exports.generateOtp = function generateOtp(email) {
  let token = speakeasy.totp({
    secret: process.env.OTP_KEY,
    encoding: "base32",
    digits: 4,
    step: 60,
    window: 10,
  });
  map.set(email, token);
  return token;
};

module.exports.verifyOtp = function (token) {
  let expiry = speakeasy.totp.verifyDelta({
    secret: process.env.OTP_KEY,
    encoding: "base32",
    token: token,
    step: 60,
    window: 10,
  });
  return expiry;
};

module.exports.validateOtp = function (email, otp) {
  let expiry = this.verifyOtp(otp);
  if (map.get(email) === otp) {
    map.delete(email);
    return true;
  } else return false;
};

module.exports.sendEmailTemplate = async function (toEmail, name, callback) {
  const otp = this.generateOtp(toEmail);
  const body = emailTemplate.registerEmail(name, otp);
  var transporter = nodeMailer.createTransport(mailCredentials);

  var mailOptions = {
    from: "appsupport@mytranscend.com",
    to: toEmail,
    subject: "MySleepDash Account Setup One Time Code",
    html: body,
    attachment: [{
      filename: 'transcend_horz_rgb.png',
      filePath: __dirname + "/transcend_horz_rgb.png"
    }]
  };

  return transporter.sendMail(mailOptions, callback);

};

module.exports.resetPasswordTemplate = async function (toEmail, name) {
  const otp = this.generateOtp(toEmail);
  const body = emailTemplate.resetPassword(name, otp);
  var transporter = nodeMailer.createTransport(mailCredentials);

  var mailOptions = {
    from: "appsupport@mytranscend.com",
    to: toEmail,
    subject: "MySleepDash Password Reset",
    html: body,
    attachment: [{
          filename: 'transcend_horz_rgb.png',
          path: __dirname + "/transcend_horz_rgb.png"
        }]
  };
  return transporter.sendMail(mailOptions);
};