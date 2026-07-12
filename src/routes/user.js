const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getProfile, updateProfile, addAddress, deleteAddress, getWallet,
  getAllUsers, toggleUserStatus, creditWallet, changePassword,
} = require("../controllers/userController");

router.use(protect);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);
router.post("/address", addAddress);
router.delete("/address/:addressId", deleteAddress);
router.get("/wallet", getWallet);

// Admin
router.get("/", adminOnly, getAllUsers);
router.patch("/:id/status", adminOnly, toggleUserStatus);
router.post("/:id/wallet/credit", adminOnly, creditWallet);

module.exports = router;
