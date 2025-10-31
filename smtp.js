// At the top of your main application file (e.g., app.js or index.js)
require("dotenv").config();

// Access the variable
const apiKey = process.env.API_KEY;
const nodemailer = require("nodemailer");

var transporter;

transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rent.manager.corp@gmail.com",
    pass: apiKey,
  },
});

const send = (mailOptions) => {
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = { send, transporter };
