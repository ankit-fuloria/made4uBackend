const router = require("express").Router();
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const {
  createRequest, getMyRequests, getRequestById,
  getAllRequests, quoteRequest, updateRequestStatus,
} = require("../controllers/requestController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.use(protect);

router.post("/", upload.array("images", 6), gcsUpload("requests"), createRequest);
router.get("/my", getMyRequests);
router.get("/:id", getRequestById);

// Admin
router.get("/", adminOnly, getAllRequests);
router.patch("/:id/quote", adminOnly, quoteRequest);
router.patch("/:id/status", adminOnly, updateRequestStatus);

module.exports = router;
