const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { protect, adminOnly } = require("../middleware/auth");
const { getBrands, createBrand, updateBrand, deleteBrand } = require("../controllers/brandController");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.get("/", getBrands);

router.use(protect, adminOnly);
router.post("/", upload.single("logo"), createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;
