const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { protect, sellerOnly } = require("../middleware/auth");
const {
  getMyDashboard,
  getEarnings,
  getTransactions,
  getBestSellers,
  updateStoreProfile,
} = require("../controllers/sellerController");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.use(protect, sellerOnly);

router.get("/dashboard", getMyDashboard);
router.get("/earnings", getEarnings);
router.get("/transactions", getTransactions);
router.get("/best-sellers", getBestSellers);
router.put("/profile", upload.single("storeLogo"), updateStoreProfile);

module.exports = router;
