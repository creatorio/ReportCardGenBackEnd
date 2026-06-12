require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { send, transporter } = require("./smtp.js");
const bodyParser = require("body-parser");

// Use a long, secure, and private secret key (keep this in your environment variables)
const SECRET_KEY_TEMP = process.env.SECRET_KEY;
const SECRET_KEY = Buffer.from(SECRET_KEY_TEMP, "base64");

/**
 * 1. Generate OTP and Hash
 * @param {string} identifier - User's email or phone number
 * @param {number} expiresInMs - OTP validity in milliseconds (e.g., 300000 for 5 mins)
 * @returns {Object} - The raw OTP, expiry timestamp, and the secure hash
 */
function generateOTP(identifier, expiresInMs = 5 * 60 * 1000) {
  // Generate a 6-digit cryptographic OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + expiresInMs;

  // Create a payload and hash it
  const dataString = `${identifier}.${otp}.${expiresAt}`;
  const hash = crypto
    .createHmac("sha512", SECRET_KEY)
    .update(dataString)
    .digest("hex");

  // Combine the hash and expiry time to send to the client
  const secureToken = `${hash}.${expiresAt}`;

  return { otp, secureToken };
}

/**
 * 2. Verify OTP
 * @param {string} identifier - User's email or phone number
 * @param {string} providedOtp - The OTP code the user entered
 * @param {string} secureToken - The token sent back from the client (Hash.Expiry)
 * @returns {boolean} - True if valid, false otherwise
 */
function verifyOTP(identifier, providedOtp, secureToken) {
  const [hash, expiresAt] = secureToken.split(".");

  // Check if the OTP has expired
  if (Date.now() > parseInt(expiresAt, 10)) {
    return false; // OTP has expired
  }

  // Re-create the hash using the provided data
  const dataString = `${identifier}.${providedOtp}.${expiresAt}`;
  const computedHash = crypto
    .createHmac("sha512", SECRET_KEY)
    .update(dataString)
    .digest("hex");

  // Securely compare the two hashes (timing-safe comparison)
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(computedHash, "hex"),
  );
}

const router = express();
router.use(bodyParser.json());
router.use(cors({ origin: "*" }));
router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const { otp, secureToken } = generateOTP(email);

  await transporter.sendMail({
    from: "rent.manager.corp@gmail.com",
    to: email,
    subject: "OTP",
    text: `Your verification code is ${otp}`,
  });

  res.json({ message: secureToken });
});

router.post("/verify-otp", (req, res) => {
  const { email, otp, secureToken } = req.body;

  const isVerified = verifyOTP(email, otp, secureToken);
  if (!isVerified) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  res.json({ success: true });
});

router.listen(4000, () => {
  console.log(`listening on port ${4000}`);
});

module.exports = router;
