const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth");
const { getBanners, createBanner, updateBanner, deleteBanner } = require("../controllers/bannerController");

router.get("/", getBanners);

router.use(protect, adminOnly);
router.post("/", createBanner);
router.put("/:id", updateBanner);
router.delete("/:id", deleteBanner);

module.exports = router;
