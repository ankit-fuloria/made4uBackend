const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Accepts 2 / "2" / 2.0 as valid whole numbers, rejects "2.5", "abc", null, etc.
const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product", "name images price discountedPrice stock");
    if (!cart) return res.json({ success: true, cart: { items: [], total: 0 } });
    const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ success: true, cart, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = toPositiveInt(req.body.quantity ?? 1);
    if (!productId || !isValidId(productId)) {
      return res.status(400).json({ success: false, message: "A valid productId is required" });
    }
    if (quantity === null || quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive whole number" });
    }
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    const price = product.discountedPrice ?? product.price;
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      if (product.stock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      cart = await Cart.create({ user: req.user.id, items: [{ product: productId, quantity, price }] });
    } else {
      const existing = cart.items.find((i) => i.product.toString() === productId);
      const newQuantity = (existing?.quantity ?? 0) + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      if (existing) {
        existing.quantity = newQuantity;
        existing.price = price;
      } else {
        cart.items.push({ product: productId, quantity, price });
      }
      await cart.save();
    }
    await cart.populate("items.product", "name images price discountedPrice stock");
    const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ success: true, cart, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const quantity = toPositiveInt(req.body.quantity);
    if (!isValidId(req.params.productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }
    if (quantity === null) {
      return res.status(400).json({ success: false, message: "Quantity must be a whole number" });
    }
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
    const item = cart.items.find((i) => i.product.toString() === req.params.productId);
    if (!item) return res.status(404).json({ success: false, message: "Item not in cart" });
    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
    } else {
      const product = await Product.findById(req.params.productId);
      if (!product || !product.isActive) {
        return res.status(404).json({ success: false, message: "Product no longer available" });
      }
      if (product.stock < quantity) {
        return res.status(400).json({ success: false, message: "Insufficient stock" });
      }
      item.quantity = quantity;
    }
    await cart.save();
    const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ success: true, cart, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    if (!isValidId(req.params.productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.productId);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
