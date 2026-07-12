const router = require("express").Router();
const { protect, adminOnly, sellerOnly } = require("../middleware/auth");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getSellerOrders,
  acceptOrder,
  rejectOrder,
  markReadyToDispatch,
  shipOrder,
  markDelivered,
} = require("../controllers/orderController");

router.use(protect);

router.post("/", createOrder);
router.get("/my", getMyOrders);

// Seller — declared before "/:id" so "seller" isn't treated as an order id.
// Sellers drive the whole fulfillment pipeline; admin is read-only in normal
// use (see PATCH /:id/status below for the admin emergency override).
router.get("/seller/mine", sellerOnly, getSellerOrders);
router.patch("/:id/accept", sellerOnly, acceptOrder);
router.patch("/:id/reject", sellerOnly, rejectOrder);
router.patch("/:id/ready-to-dispatch", sellerOnly, markReadyToDispatch);
router.patch("/:id/ship", sellerOnly, shipOrder);
router.patch("/:id/deliver", sellerOnly, markDelivered);

router.get("/:id", getOrderById);
router.patch("/:id/cancel", cancelOrder);

// Admin — read-only order list, plus a free-form status override for
// emergencies (seller unresponsive, data fix, etc). Not exposed as normal
// per-order action buttons in the UI.
router.get("/", adminOnly, getAllOrders);
router.patch("/:id/status", adminOnly, updateOrderStatus);

module.exports = router;
