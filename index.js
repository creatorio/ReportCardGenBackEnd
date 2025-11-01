const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { send, transporter } = require("./smtp.js");
const bodyParser = require("body-parser");

const router = express();
router.use(bodyParser.json());
router.use(cors({ origin: "*" }));
router.use(express.urlencoded({ extended: false }));
router.use(express.json());
const otpStore = new Map(); // Store temporary OTPs (use Redis or DB in production)

router.post("/send-otp", async (req, res) => {
  console.log(req);
  const { email } = req.body;
  const otp = crypto.randomInt(100000, 999999).toString();

  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // valid for 5 minutes

  await transporter.sendMail({
    from: "rent.manager.corp@gmail.com",
    to: email,
    subject: "OTP",
    text: `Your verification code is ${otp}`,
  });

  res.json({ message: "OTP sent successfully" });
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  otpStore.delete(email);

  res.json({ success: true });
});

router.listen(4000, () => {
  console.log(`Example router listening on port ${4000}`);
});

module.exports = router;
