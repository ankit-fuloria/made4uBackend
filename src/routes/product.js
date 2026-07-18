const router = require("express").Router();
const multer = require("multer");
const { protect, adminOnly, adminOrSeller } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getAllProductsAdmin,
  getMyProducts,
  getLowStockProducts,
  approveProduct,
  rejectProduct,
} = require("../controllers/productController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);

// Admin / Seller — must be declared before the "/:id" catch-all
router.get("/admin/all", protect, adminOnly, getAllProductsAdmin);
router.get("/mine", protect, adminOrSeller, getMyProducts);
router.get("/low-stock", protect, adminOrSeller, getLowStockProducts);
router.patch("/:id/approve", protect, adminOnly, approveProduct);
router.patch("/:id/reject", protect, adminOnly, rejectProduct);

router.get("/:id", getProductById);

router.use(protect, adminOrSeller);
router.post("/", upload.array("images", 5), gcsUpload("products"), createProduct);
router.put("/:id", upload.array("images", 5), gcsUpload("products"), updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
