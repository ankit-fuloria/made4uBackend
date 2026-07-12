const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOtpEmail } = require("../utils/email");

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || "secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const generateGameToken = (payload) =>
  jwt.sign(payload, process.env.GAME_TOKEN_SECRET || process.env.JWT_SECRET || "secret", {
    expiresIn: "30d",
  });

const buildAuthResponse = (user) => ({
  token: generateToken({ id: user._id, typeOfUser: user.typeOfUser }),
  gameToken: generateGameToken({ id: user._id, game: true }),
  user: {
    id: user._id,
    username: user.username,
    typeOfUser: user.typeOfUser,
    phone: user.phone,
    emailId: user.emailId,
    wallet: user.wallet,
    businessName: user.businessName,
    sellerStatus: user.sellerStatus,
  },
});

const generateOtp = () =>
  process.env.OTP_BYPASS === "true" ? "123456" : String(Math.floor(100000 + Math.random() * 900000));

const maskEmail = (email) => {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}${"*".repeat(Math.max(user.length - 2, 2))}@${domain}`;
};

// ── LOGIN ──────────────────────────────────────────────────────────────────

exports.loginSendOtp = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: "Phone or email is required" });
    }

    const isEmail = identifier.includes("@");
    const user = isEmail
      ? await User.findOne({ emailId: identifier.toLowerCase() })
      : await User.findOne({ phone: Number(identifier) });

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found. Please sign up." });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is deactivated" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndDelete({ identifier: identifier.toLowerCase(), type: "login" });
    await OTP.create({ identifier: identifier.toLowerCase(), email: user.emailId, otp, type: "login", expiresAt });

    await sendOtpEmail(user.emailId, otp, "login");

    res.json({
      success: true,
      message: "OTP sent to your registered email",
      email: maskEmail(user.emailId),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.loginVerifyOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: "Identifier and OTP are required" });
    }

    const record = await OTP.findOne({
      identifier: identifier.toLowerCase(),
      type: "login",
      isUsed: false,
    });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
    }
    if (new Date() > record.expiresAt) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }
    if (record.otp !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await OTP.deleteOne({ _id: record._id });

    const isEmail = identifier.includes("@");
    const user = isEmail
      ? await User.findOne({ emailId: identifier.toLowerCase() })
      : await User.findOne({ phone: Number(identifier) });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, ...buildAuthResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── SIGNUP ─────────────────────────────────────────────────────────────────

exports.signupSendOtp = async (req, res) => {
  try {
    const { username, emailId, phone } = req.body;
    if (!username || !emailId || !phone) {
      return res.status(400).json({ success: false, message: "Name, email and phone are required" });
    }

    const existing = await User.findOne({ $or: [{ emailId: emailId.toLowerCase() }, { phone: Number(phone) }] });
    if (existing) {
      const field = existing.emailId === emailId.toLowerCase() ? "Email" : "Phone";
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndDelete({ identifier: emailId.toLowerCase(), type: "signup" });
    await OTP.create({
      identifier: emailId.toLowerCase(),
      email: emailId.toLowerCase(),
      otp,
      type: "signup",
      expiresAt,
      pendingData: { username, phone: Number(phone) },
    });

    await sendOtpEmail(emailId, otp, "signup");

    res.json({
      success: true,
      message: "OTP sent to your email",
      email: maskEmail(emailId),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.signupVerifyOtp = async (req, res) => {
  try {
    const { emailId, otp } = req.body;
    if (!emailId || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const record = await OTP.findOne({
      identifier: emailId.toLowerCase(),
      type: "signup",
      isUsed: false,
    });

    if (!record) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new one." });
    }
    if (new Date() > record.expiresAt) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({ success: false, message: "OTP has expired" });
    }
    if (record.otp !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    await OTP.deleteOne({ _id: record._id });

    const user = await User.create({
      username: record.pendingData.username,
      emailId: record.email,
      phone: record.pendingData.phone,
      password: crypto.randomBytes(16).toString("hex"),
    });

    res.status(201).json({ success: true, ...buildAuthResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── STAFF (Admin / Seller) — password login ─────────────────────────────────
// Kept separate from the customer OTP flow: admins and sellers use a
// traditional email + password login to reach their dashboards.

exports.staffLogin = async (req, res) => {
  try {
    const { emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({
      emailId: emailId.toLowerCase(),
      typeOfUser: { $in: ["Admin", "Seller"] },
    }).select("+password");

    if (!user) {
      return res.status(404).json({ success: false, message: "No staff account found with this email" });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been deactivated" });
    }
    if (user.typeOfUser === "Seller") {
      if (user.sellerStatus === "Pending") {
        return res.status(403).json({ success: false, message: "Your seller account is pending admin approval" });
      }
      if (user.sellerStatus === "Rejected") {
        return res.status(403).json({ success: false, message: "Your seller application was rejected" });
      }
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.json({ success: true, ...buildAuthResponse(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── SELLER SIGNUP — creates a Pending seller account for admin review ───────

exports.sellerSignup = async (req, res) => {
  try {
    const { businessName, username, emailId, phone, password } = req.body;
    if (!businessName || !username || !emailId || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({
      $or: [{ emailId: emailId.toLowerCase() }, { phone: Number(phone) }],
    });
    if (existing) {
      const field = existing.emailId === emailId.toLowerCase() ? "Email" : "Phone";
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }

    await User.create({
      username,
      emailId: emailId.toLowerCase(),
      phone: Number(phone),
      password,
      typeOfUser: "Seller",
      sellerStatus: "Pending",
      businessName,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted! We'll email you once your seller account is approved.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
