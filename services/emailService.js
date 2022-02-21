const express = require("express");
const nodeMailer = require("nodemailer");
const speakeasy = require("speakeasy");
const emailService = express();
emailService.use(express.json());

let map = new Map();

module.exports.sendEmail = function (toEmail) {
  var transporter = nodeMailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "caprusit.test@gmail.com",
      pass: "Welcome@01",
    },
  });

  var mailOptions = {
    from: "caprusit.test@gmail.com",
    to: toEmail,
    subject: "Sending Email TO Verify",
    text:
      "Dear Sir / Madam, \r\nYour One Time Password(OTP) is :" +
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
