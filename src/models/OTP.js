const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["login", "signup"], required: true },
  pendingData: {
    username: String,
    phone: Number,
  },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ identifier: 1, type: 1 });

module.exports = mongoose.model("OTP", otpSchema);
