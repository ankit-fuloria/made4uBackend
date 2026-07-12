const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const { protect, adminOnly } = require("../middleware/auth");
const {
  createRequest, getMyRequests, getRequestById,
  getAllRequests, quoteRequest, updateRequestStatus,
} = require("../controllers/requestController");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, `req-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.use(protect);

router.post("/", upload.array("images", 6), createRequest);
router.get("/my", getMyRequests);
router.get("/:id", getRequestById);

// Admin
router.get("/", adminOnly, getAllRequests);
router.patch("/:id/quote", adminOnly, quoteRequest);
router.patch("/:id/status", adminOnly, updateRequestStatus);

module.exports = router;
