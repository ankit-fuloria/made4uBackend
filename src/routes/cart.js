const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

router.use(protect);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:productId", updateCartItem);
router.delete("/clear", clearCart);
router.delete("/:productId", removeFromCart);

module.exports = router;
