const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["Amount", "Percentage"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    // Only meaningful for Percentage coupons — caps the rupee discount so a
    // "50% off" coupon can't wipe out the whole order value. Null = no cap.
    maxDiscountAmount: { type: Number, default: null, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, default: null },
    // Unlimited        — no restriction beyond isActive/expiry/minOrder.
    // OneTime           — can be redeemed once total, across all customers.
    // OncePerCustomer    — each customer can redeem it once (different customers each get one use).
    // Recurring          — capped at `recurringLimit` uses per `recurringPeriod` (Weekly/Monthly/Yearly), resets each period.
    usageType: {
      type: String,
      enum: ["Unlimited", "OneTime", "OncePerCustomer", "Recurring"],
      default: "Unlimited",
    },
    recurringPeriod: { type: String, enum: ["Weekly", "Monthly", "Yearly"], default: null },
    recurringLimit: { type: Number, default: null, min: 1 },
    // Lifetime redemption count — denormalized for fast display; the source
    // of truth for per-customer/per-period checks is the CouponUsage collection.
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
