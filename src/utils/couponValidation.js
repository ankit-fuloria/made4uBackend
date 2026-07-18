const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");

const getPeriodStart = (period) => {
  const now = new Date();
  if (period === "Weekly") {
    const day = now.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }
  if (period === "Monthly") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "Yearly") return new Date(now.getFullYear(), 0, 1);
  return new Date(0);
};

const computeDiscount = (coupon, orderAmount) => {
  if (coupon.discountType === "Amount") {
    return Math.min(coupon.discountValue, orderAmount);
  }
  const raw = (orderAmount * coupon.discountValue) / 100;
  const capped = coupon.maxDiscountAmount != null ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  return Math.min(Math.round(capped * 100) / 100, orderAmount);
};

// Validates a coupon code for a given user + order amount. Returns
// { success: true, coupon, discount } or { success: false, message }.
const validateCouponForUser = async (code, userId, orderAmount) => {
  if (!code) return { success: false, message: "Coupon code is required" };
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  if (!coupon || !coupon.isActive) {
    return { success: false, message: "Invalid coupon code" };
  }
  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return { success: false, message: "This coupon has expired" };
  }
  if (orderAmount < coupon.minOrderAmount) {
    return { success: false, message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}` };
  }

  if (coupon.usageType === "OneTime") {
    const used = await CouponUsage.countDocuments({ coupon: coupon._id });
    if (used >= 1) return { success: false, message: "This coupon has already been used" };
  } else if (coupon.usageType === "OncePerCustomer") {
    const used = await CouponUsage.countDocuments({ coupon: coupon._id, user: userId });
    if (used >= 1) return { success: false, message: "You've already used this coupon" };
  } else if (coupon.usageType === "Recurring") {
    const periodStart = getPeriodStart(coupon.recurringPeriod);
    const used = await CouponUsage.countDocuments({ coupon: coupon._id, createdAt: { $gte: periodStart } });
    if (coupon.recurringLimit != null && used >= coupon.recurringLimit) {
      return {
        success: false,
        message: `This coupon's ${(coupon.recurringPeriod || "").toLowerCase()} usage limit has been reached`,
      };
    }
  }

  const discount = computeDiscount(coupon, orderAmount);
  return { success: true, coupon, discount };
};

// Records that a coupon was redeemed on an order — call only after the
// order is actually created, never speculatively.
const recordCouponUsage = async (coupon, userId, orderId, discount) => {
  await CouponUsage.create({ coupon: coupon._id, user: userId, order: orderId, discountApplied: discount });
  await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
};

module.exports = { validateCouponForUser, recordCouponUsage, computeDiscount, getPeriodStart };
