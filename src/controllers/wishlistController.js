const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("wishlist")
      .populate({
        path: "wishlist",
        select: "name description price discountedPrice images stock productType ratings isFeatured category",
        populate: { path: "category", select: "name" },
      });
    res.json({ success: true, products: user?.wishlist ?? [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishlist: productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }
    await User.findByIdAndUpdate(req.user.id, { $pull: { wishlist: productId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWishlistIds = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wishlist");
    res.json({ success: true, ids: (user?.wishlist ?? []).map((id) => id.toString()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
