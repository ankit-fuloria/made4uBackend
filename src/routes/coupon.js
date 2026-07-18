const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponUsage,
} = require("../controllers/couponController");

router.use(protect);

router.post("/validate", validateCoupon);

router.use(adminOnly);
router.get("/", getAllCoupons);
router.post("/", createCoupon);
router.put("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);
router.get("/:id/usage", getCouponUsage);

module.exports = router;
