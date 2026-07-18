const router = require("express").Router();
const multer = require("multer");
const { protect, sellerOnly } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const {
  getMyDashboard,
  getEarnings,
  getTransactions,
  getBestSellers,
  updateStoreProfile,
} = require("../controllers/sellerController");

const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, sellerOnly);

router.get("/dashboard", getMyDashboard);
router.get("/earnings", getEarnings);
router.get("/transactions", getTransactions);
router.get("/best-sellers", getBestSellers);
router.put("/profile", upload.single("storeLogo"), gcsUpload("sellers"), updateStoreProfile);

module.exports = router;
