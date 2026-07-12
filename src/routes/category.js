const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { protect, adminOnly } = require("../middleware/auth");
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.get("/", getCategories);

router.use(protect, adminOnly);
router.post("/", upload.single("image"), createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
