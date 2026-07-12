const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getWishlistIds,
} = require("../controllers/wishlistController");

router.use(protect);

router.get("/", getWishlist);
router.get("/ids", getWishlistIds);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);

module.exports = router;
