const router = require("express").Router();
const multer = require("multer");
const { protect, adminOnly } = require("../middleware/auth");
const { gcsUpload } = require("../middleware/gcsUpload");
const {
  createRequest, getMyRequests, getRequestById, addProposal, acceptProposal,
  getAllRequests, quoteRequest, updateRequestStatus,
} = require("../controllers/requestController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf" && file.mimetype !== "application/pdf") {
      return cb(new Error("Reference document must be a PDF"));
    }
    cb(null, true);
  },
});

router.use(protect);

router.post(
  "/",
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "pdf", maxCount: 1 },
  ]),
  gcsUpload("requests"),
  createRequest
);
router.get("/my", getMyRequests);
router.get("/:id", getRequestById);
router.post("/:id/proposals", upload.array("images", 6), gcsUpload("requests"), addProposal);
router.patch("/:id/accept", acceptProposal);

// Admin
router.get("/", adminOnly, getAllRequests);
router.patch("/:id/quote", adminOnly, quoteRequest);
router.patch("/:id/status", adminOnly, updateRequestStatus);

module.exports = router;
