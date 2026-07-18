const Product = require("../models/Product");

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, featured } = req.query;
    const filter = { isActive: true, approvalStatus: "Approved" };
    if (category) filter.category = category;
    if (featured === "true") filter.isFeatured = true;
    if (search) filter.$text = { $search: search };

    const products = await Product.find(filter)
      .populate("category", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments(filter);
    res.json({ success: true, products, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name").populate("brand", "name");
    if (!product || !product.isActive || product.approvalStatus !== "Approved") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — sees every product (active + inactive, any approval state, any seller)
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, seller, approvalStatus } = req.query;
    const filter = {};
    if (seller) filter.seller = seller;
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("brand", "name")
      .populate("seller", "username businessName emailId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Product.countDocuments(filter);
    res.json({ success: true, products, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — only their own listings (active + inactive, any approval state)
exports.getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { seller: req.user.id };
    const products = await Product.find(filter)
      .populate("category", "name")
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Product.countDocuments(filter);
    res.json({ success: true, products, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin + Seller — items at or below their lowStockThreshold
exports.getLowStockProducts = async (req, res) => {
  try {
    const filter =
      req.user.typeOfUser === "Seller"
        ? { seller: req.user.id, isActive: true }
        : { isActive: true };
    const products = await Product.find(filter)
      .populate("category", "name")
      .where("stock")
      .lte(10) // fetch a reasonable candidate set, then filter per-doc threshold below
      .lean();
    const lowStock = products.filter((p) => p.stock <= (p.lowStockThreshold ?? 5));
    res.json({ success: true, products: lowStock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const images = req.files ? req.files.map((f) => f.publicUrl) : [];
    // Sellers can only ever create products under their own account.
    const isSeller = req.user.typeOfUser === "Seller";
    const seller = isSeller ? req.user.id : req.body.seller || null;
    // Seller listings need admin approval before they go live; platform
    // (admin-owned) products are auto-approved.
    const approvalStatus = isSeller ? "Pending" : "Approved";
    const product = await Product.create({ ...req.body, images, seller, approvalStatus });
    res.status(201).json({ success: true, product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "SKU already in use" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });
    if (req.user.typeOfUser === "Seller" && String(existing.seller) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only edit your own products" });
    }

    const images = req.files && req.files.length ? req.files.map((f) => f.publicUrl) : undefined;
    const updates = { ...req.body, ...(images && { images }) };
    // Sellers can never reassign ownership or self-approve a listing.
    if (req.user.typeOfUser === "Seller") {
      delete updates.seller;
      delete updates.approvalStatus;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, product });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "SKU already in use" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Product not found" });
    if (req.user.typeOfUser === "Seller" && String(existing.seller) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "You can only delete your own products" });
    }
    existing.isActive = false;
    await existing.save();
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true, approvalStatus: "Approved" })
      .populate("category", "name")
      .limit(10);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin — moderate seller-submitted listings
exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approvalStatus: "Approved" }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { approvalStatus: "Rejected" }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
