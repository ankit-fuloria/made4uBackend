const Coupon = require("../models/Coupon");
const CouponUsage = require("../models/CouponUsage");
const { validateCouponForUser } = require("../utils/couponValidation");

// Admin — list every coupon (active and inactive)
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const validateUsageFields = (body) => {
  const { usageType, recurringPeriod, recurringLimit } = body;
  if (usageType && !["Unlimited", "OneTime", "OncePerCustomer", "Recurring"].includes(usageType)) {
    return "Invalid usage type";
  }
  if (usageType === "Recurring") {
    if (!["Weekly", "Monthly", "Yearly"].includes(recurringPeriod)) {
      return "Recurring coupons need a period of Weekly, Monthly or Yearly";
    }
    if (!recurringLimit || recurringLimit < 1) {
      return "Recurring coupons need a usage limit of at least 1";
    }
  }
  return null;
};

exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      expiresAt,
      usageType,
      recurringPeriod,
      recurringLimit,
    } = req.body;
    if (!code || !discountType || discountValue == null) {
      return res.status(400).json({ success: false, message: "Code, discount type and value are required" });
    }
    if (!["Amount", "Percentage"].includes(discountType)) {
      return res.status(400).json({ success: false, message: "Discount type must be Amount or Percentage" });
    }
    if (discountType === "Percentage" && discountValue > 100) {
      return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100" });
    }
    const usageError = validateUsageFields(req.body);
    if (usageError) return res.status(400).json({ success: false, message: usageError });

    const isRecurring = usageType === "Recurring";
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue,
      maxDiscountAmount: maxDiscountAmount || null,
      minOrderAmount: minOrderAmount || 0,
      expiresAt: expiresAt || null,
      usageType: usageType || "Unlimited",
      recurringPeriod: isRecurring ? recurringPeriod : null,
      recurringLimit: isRecurring ? recurringLimit : null,
    });
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A coupon with this code already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const {
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      expiresAt,
      usageType,
      recurringPeriod,
      recurringLimit,
      isActive,
    } = req.body;
    if (discountType && !["Amount", "Percentage"].includes(discountType)) {
      return res.status(400).json({ success: false, message: "Discount type must be Amount or Percentage" });
    }
    if (usageType) {
      const usageError = validateUsageFields(req.body);
      if (usageError) return res.status(400).json({ success: false, message: usageError });
    }

    const update = { discountType, discountValue, maxDiscountAmount, minOrderAmount, expiresAt, isActive };
    if (usageType) {
      update.usageType = usageType;
      update.recurringPeriod = usageType === "Recurring" ? recurringPeriod : null;
      update.recurringLimit = usageType === "Recurring" ? recurringLimit : null;
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Soft delete — keeps history for any orders that already used this code.
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    res.json({ success: true, message: "Coupon deactivated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — every order that redeemed this coupon, newest first.
exports.getCouponUsage = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    const usage = await CouponUsage.find({ coupon: coupon._id })
      .populate("user", "username phone emailId")
      .populate("order", "totalAmount status createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, usage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Customer — check a code at checkout and get back the discount it grants.
exports.validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (orderAmount == null) {
      return res.status(400).json({ success: false, message: "Order amount is required" });
    }
    const result = await validateCouponForUser(code, req.user.id, orderAmount);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
