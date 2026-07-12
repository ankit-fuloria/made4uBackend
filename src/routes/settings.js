const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const { getSettings, updateSettings } = require("../controllers/settingsController");

// Public read (storefront needs currency symbol / tax rate)
router.get("/", getSettings);

router.put("/", protect, adminOnly, updateSettings);

module.exports = router;
