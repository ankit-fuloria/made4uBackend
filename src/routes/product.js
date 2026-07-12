const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { protect, adminOnly, adminOrSeller } = require("../middleware/auth");
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

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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
router.post("/", upload.array("images", 5), createProduct);
router.put("/:id", upload.array("images", 5), updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
