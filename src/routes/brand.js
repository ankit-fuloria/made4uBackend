const router = require("express").Router();
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const { getBrands, createBrand, updateBrand, deleteBrand } = require("../controllers/brandController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getBrands);

router.use(protect, adminOnly);
router.post("/", upload.single("logo"), gcsUpload("brands"), createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;
