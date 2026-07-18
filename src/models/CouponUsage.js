const mongoose = require("mongoose");

// One row per order that redeemed a coupon. This is the source of truth for
// OncePerCustomer / Recurring eligibility checks, and for the admin's
// "which orders used this coupon" view — not just a running counter.
const couponUsageSchema = new mongoose.Schema(
  {
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    discountApplied: { type: Number, required: true },
  },
  { timestamps: true }
);

couponUsageSchema.index({ coupon: 1, user: 1 });
couponUsageSchema.index({ coupon: 1, createdAt: 1 });

module.exports = mongoose.model("CouponUsage", couponUsageSchema);
