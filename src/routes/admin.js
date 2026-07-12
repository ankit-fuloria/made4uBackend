const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getDashboard,
  listSellers,
  approveSeller,
  rejectSeller,
  getReports,
  getSettlements,
  paySettlement,
} = require("../controllers/adminController");

router.use(protect, adminOnly);

router.get("/dashboard", getDashboard);
router.get("/sellers", listSellers);
router.patch("/sellers/:id/approve", approveSeller);
router.patch("/sellers/:id/reject", rejectSeller);
router.get("/reports", getReports);
router.get("/settlements", getSettlements);
router.post("/settlements/:sellerId/pay", paySettlement);

module.exports = router;
