const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Settings = require("../models/Settings");

// Creates per-seller Sale + Commission transactions the moment an order
// first becomes "Delivered". Guarded by callers so it only ever runs once
// per order (on the Delivered transition, not on every save).
const recordEarningsOnDelivery = async (order) => {
  const settings = await Settings.getSingleton();
  const rate = settings.commissionRatePercent || 0;

  const bySeller = {};
  for (const item of order.items) {
    if (!item.seller) continue; // platform-owned item, no payout needed
    const key = String(item.seller);
    bySeller[key] = (bySeller[key] || 0) + item.price * item.quantity;
  }

  for (const [sellerId, subtotal] of Object.entries(bySeller)) {
    const commission = Math.round(subtotal * (rate / 100) * 100) / 100;
    const net = Math.round((subtotal - commission) * 100) / 100;
    await Transaction.create({ seller: sellerId, order: order._id, type: "Sale", amount: net });
    if (commission > 0) {
      await Transaction.create({
        seller: sellerId,
        order: order._id,
        type: "Commission",
        amount: commission,
        note: `${rate}% platform commission`,
      });
    }
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = "COD", orderNote } = req.body;
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }
    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({ success: false, message: `Product ${item.product?.name} is unavailable` });
      }
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${item.product.name}` });
      }
    }
    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    if (paymentMethod === "Wallet") {
      const user = await User.findById(req.user.id);
      if (user.wallet < totalAmount) {
        return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
      }
      await User.findByIdAndUpdate(req.user.id, { $inc: { wallet: -totalAmount } });
    }

    const orderItems = cart.items.map((i) => ({
      product: i.product._id,
      name: i.product.name,
      quantity: i.quantity,
      price: i.price,
      seller: i.product.seller || null,
    }));

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      orderNote,
      paymentStatus: paymentMethod === "Wallet" ? "Paid" : "Pending",
      // Orders skip the Pending/accept-reject step for now and start
      // straight at Confirmed — sellers begin their flow at "ready to
      // dispatch" instead of having to accept every incoming order first.
      status: "Confirmed",
    });

    // deduct stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }

    // clear cart
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Order.countDocuments({ user: req.user.id });
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).populate("items.product", "name images");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!["Pending", "Confirmed"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled at this stage" });
    }
    order.status = "Cancelled";
    if (order.paymentStatus === "Paid") {
      await User.findByIdAndUpdate(req.user.id, { $inc: { wallet: order.totalAmount } });
      order.paymentStatus = "Refunded";
    }
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .populate("user", "username phone emailId")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Order.countDocuments(filter);
    res.json({ success: true, orders, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const wasDelivered = order.status === "Delivered";
    order.status = status;
    await order.save();
    if (!wasDelivered && status === "Delivered") await recordEarningsOnDelivery(order);
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — orders containing at least one of their items
exports.getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    const filter = { "items.seller": sellerId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("user", "username phone emailId")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Order.countDocuments(filter);

    // Annotate each order with the seller's own slice of it, since an order
    // can contain items from multiple sellers.
    const shaped = orders.map((o) => {
      const obj = o.toObject();
      const mine = obj.items.filter((i) => String(i.seller) === String(sellerId));
      obj.myItems = mine;
      obj.mySubtotal = mine.reduce((s, i) => s + i.price * i.quantity, 0);
      obj.isFullyMine = mine.length === obj.items.length;
      return obj;
    });

    res.json({ success: true, orders: shaped, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — accept a Pending order (moves it to Confirmed). Sellers only —
// admins are read-only on orders in normal use (see updateOrderStatus for
// the admin emergency override).
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.items.every((i) => String(i.seller) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "This order contains items from other sellers" });
    }
    if (order.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending orders can be accepted" });
    }
    order.status = "Confirmed";
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — reject a Pending order (restocks items, refunds if paid)
exports.rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.items.every((i) => String(i.seller) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "This order contains items from other sellers" });
    }
    if (order.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Only pending orders can be rejected" });
    }
    order.status = "Cancelled";
    order.rejectReason = reason || "Rejected by seller";
    if (order.paymentStatus === "Paid") {
      await User.findByIdAndUpdate(order.user, { $inc: { wallet: order.totalAmount } });
      order.paymentStatus = "Refunded";
    }
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — mark a Confirmed order as Ready to Dispatch
exports.markReadyToDispatch = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.items.every((i) => String(i.seller) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "This order contains items from other sellers" });
    }
    if (order.status !== "Confirmed") {
      return res.status(400).json({ success: false, message: "Only confirmed orders can be marked ready to dispatch" });
    }
    order.status = "Ready to Dispatch";
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — mark a Ready to Dispatch order shipped with courier + tracking details
exports.shipOrder = async (req, res) => {
  try {
    const { courierName, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.items.every((i) => String(i.seller) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "This order contains items from other sellers" });
    }
    if (order.status !== "Ready to Dispatch") {
      return res.status(400).json({ success: false, message: "Order must be ready to dispatch before it can be shipped" });
    }
    order.status = "Shipped";
    order.courierName = courierName;
    order.trackingNumber = trackingNumber;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seller — mark a Shipped order as Delivered (completes the order and
// records seller earnings once).
exports.markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (!order.items.every((i) => String(i.seller) === String(req.user.id))) {
      return res.status(403).json({ success: false, message: "This order contains items from other sellers" });
    }
    if (order.status !== "Shipped") {
      return res.status(400).json({ success: false, message: "Only shipped orders can be marked delivered" });
    }
    order.status = "Delivered";
    await order.save();
    await recordEarningsOnDelivery(order);
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
