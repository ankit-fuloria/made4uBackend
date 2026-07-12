const router = require("express").Router();
const {
  loginSendOtp,
  loginVerifyOtp,
  signupSendOtp,
  signupVerifyOtp,
  staffLogin,
  sellerSignup,
} = require("../controllers/authController");

router.post("/login/send-otp", loginSendOtp);
router.post("/login/verify-otp", loginVerifyOtp);

router.post("/signup/send-otp", signupSendOtp);
router.post("/signup/verify-otp", signupVerifyOtp);

// Admin / Seller
router.post("/staff/login", staffLogin);
router.post("/seller/signup", sellerSignup);

module.exports = router;
