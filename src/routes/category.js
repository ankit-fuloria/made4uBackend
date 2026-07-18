const router = require("express").Router();
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const { getCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getCategories);

router.use(protect, adminOnly);
router.post("/", upload.single("image"), gcsUpload("categories"), createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
