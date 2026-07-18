const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

exports.getMyDashboard = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalProducts, activeProducts, lowStockCount, orders, todaysOrderCount, recentOrdersRaw] = await Promise.all([
      Product.countDocuments({ seller: sellerId }),
      Product.countDocuments({ seller: sellerId, isActive: true }),
      Product.countDocuments({ seller: sellerId, isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
      Order.find({ "items.seller": sellerId }),
      Order.countDocuments({ "items.seller": sellerId, createdAt: { $gte: startOfToday } }),
      Order.find({ "items.seller": sellerId }).sort({ createdAt: -1 }).limit(5).populate("user", "username"),
    ]);

    let totalRevenue = 0;
    let totalOrdersCount = 0;
    let pendingOrders = 0;
    const statusCounts = {};
    const salesByDay = {};

    orders.forEach((o) => {
      const mine = o.items.filter((i) => String(i.seller) === String(sellerId));
      if (mine.length === 0) return;
      totalOrdersCount += 1;
      const mineTotal = mine.reduce((s, i) => s + i.price * i.quantity, 0);
      if (o.status !== "Cancelled") totalRevenue += mineTotal;
      if (o.status === "Pending") pendingOrders += 1;
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

      if (o.status === "Delivered" && o.updatedAt >= sevenDaysAgo) {
        const day = o.updatedAt.toISOString().slice(0, 10);
        salesByDay[day] = (salesByDay[day] || 0) + mineTotal;
      }
    });

    const recentOrders = recentOrdersRaw.map((o) => {
      const mine = o.items.filter((i) => String(i.seller) === String(sellerId));
      return {
        id: o._id,
        customerName: o.user?.username || "",
        subtotal: mine.reduce((s, i) => s + i.price * i.quantity, 0),
        status: o.status,
        createdAt: o.createdAt,
      };
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        lowStockCount,
        totalOrders: totalOrdersCount,
        todaysOrders: todaysOrderCount,
        pendingOrders,
        totalRevenue,
        statusCounts,
        salesChart: Object.entries(salesByDay).map(([date, total]) => ({ date, total })).sort((a, b) => a.date.localeCompare(b.date)),
        recentOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Earnings ─────────────────────────────────────────────────────────────────

exports.getEarnings = async (req, res) => {
  try {
    const sellerId = new mongoose.Types.ObjectId(req.user.id);
    const [balanceAgg, totalEarnedAgg, totalPaidAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { seller: sellerId, type: { $in: ["Sale", "Settlement"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { seller: sellerId, type: "Sale" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { seller: sellerId, type: "Settlement" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      success: true,
      earnings: {
        pendingPayout: balanceAgg[0]?.total || 0,
        totalEarned: totalEarnedAgg[0]?.total || 0,
        totalPaidOut: Math.abs(totalPaidAgg[0]?.total || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ seller: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Analytics ────────────────────────────────────────────────────────────────

exports.getBestSellers = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const orders = await Order.find({ "items.seller": sellerId, status: { $ne: "Cancelled" } });
    const counts = {};
    orders.forEach((o) => {
      o.items
        .filter((i) => String(i.seller) === String(sellerId))
        .forEach((i) => {
          const key = String(i.product);
          if (!counts[key]) counts[key] = { productId: i.product, name: i.name, quantitySold: 0, revenue: 0 };
          counts[key].quantitySold += i.quantity;
          counts[key].revenue += i.price * i.quantity;
        });
    });
    const bestSellers = Object.values(counts).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);
    res.json({ success: true, bestSellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Store profile & settings ────────────────────────────────────────────────

exports.updateStoreProfile = async (req, res) => {
  try {
    const allowed = ["businessName", "businessDescription", "storeAddress", "gstNumber"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (req.body.accountHolder || req.body.accountNumber || req.body.ifsc || req.body.bankName) {
      updates.bankDetails = {
        accountHolder: req.body.accountHolder,
        accountNumber: req.body.accountNumber,
        ifsc: req.body.ifsc,
        bankName: req.body.bankName,
      };
    }
    if (req.file) updates.storeLogo = req.file.publicUrl;

    const seller = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select("-password");
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
