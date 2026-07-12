const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const RequestModel = require("../models/Request");
const Transaction = require("../models/Transaction");

exports.getDashboard = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalSellers,
      pendingSellers,
      totalProducts,
      totalOrders,
      pendingRequests,
      revenueAgg,
      commissionAgg,
      salesChartAgg,
    ] = await Promise.all([
      User.countDocuments({ typeOfUser: "Customer" }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ typeOfUser: "Seller", sellerStatus: "Approved" }),
      User.countDocuments({ typeOfUser: "Seller", sellerStatus: "Pending" }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      RequestModel.countDocuments({ status: "Pending" }),
      Order.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "Commission" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Order.aggregate([
        { $match: { status: "Delivered", updatedAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, total: { $sum: "$totalAmount" } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalSellers,
        pendingSellers,
        totalProducts,
        totalOrders,
        pendingRequests,
        totalRevenue: revenueAgg[0]?.total || 0,
        commissionEarned: commissionAgg[0]?.total || 0,
        salesChart: salesChartAgg.map((d) => ({ date: d._id, total: d.total })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listSellers = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { typeOfUser: "Seller" };
    if (status) filter.sellerStatus = status;
    const sellers = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveSeller = async (req, res) => {
  try {
    const seller = await User.findOneAndUpdate(
      { _id: req.params.id, typeOfUser: "Seller" },
      { sellerStatus: "Approved", isActive: true },
      { new: true }
    ).select("-password");
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.rejectSeller = async (req, res) => {
  try {
    const seller = await User.findOneAndUpdate(
      { _id: req.params.id, typeOfUser: "Seller" },
      { sellerStatus: "Rejected" },
      { new: true }
    ).select("-password");
    if (!seller) return res.status(404).json({ success: false, message: "Seller not found" });
    res.json({ success: true, seller });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Reports ──────────────────────────────────────────────────────────────────

exports.getReports = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [salesReport, sellerReport, customerReport] = await Promise.all([
      // Daily revenue, last 30 days, delivered orders
      Order.aggregate([
        { $match: { status: "Delivered", updatedAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, total: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      // Per-seller net earnings from recorded Sale transactions
      Transaction.aggregate([
        { $match: { type: "Sale" } },
        { $group: { _id: "$seller", totalEarnings: { $sum: "$amount" }, saleCount: { $sum: 1 } } },
        { $sort: { totalEarnings: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            sellerId: "$_id",
            businessName: "$seller.businessName",
            username: "$seller.username",
            totalEarnings: 1,
            saleCount: 1,
          },
        },
      ]),
      // Top 10 customers by total spend
      Order.aggregate([
        { $match: { paymentStatus: "Paid" } },
        { $group: { _id: "$user", totalSpent: { $sum: "$totalAmount" }, orderCount: { $sum: 1 } } },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $project: {
            customerId: "$_id",
            username: "$customer.username",
            emailId: "$customer.emailId",
            totalSpent: 1,
            orderCount: 1,
          },
        },
      ]),
    ]);

    res.json({ success: true, salesReport, sellerReport, customerReport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Payments & Settlements ───────────────────────────────────────────────────

exports.getSettlements = async (req, res) => {
  try {
    const balances = await Transaction.aggregate([
      { $match: { type: { $in: ["Sale", "Settlement"] } } },
      { $group: { _id: "$seller", pendingPayout: { $sum: "$amount" } } },
      { $match: { pendingPayout: { $gt: 0 } } },
      { $sort: { pendingPayout: -1 } },
      {
        $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "seller" },
      },
      { $unwind: "$seller" },
      {
        $project: {
          sellerId: "$_id",
          businessName: "$seller.businessName",
          username: "$seller.username",
          emailId: "$seller.emailId",
          pendingPayout: 1,
        },
      },
    ]);
    res.json({ success: true, settlements: balances });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.paySettlement = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const agg = await Transaction.aggregate([
      { $match: { seller: new mongoose.Types.ObjectId(sellerId), type: { $in: ["Sale", "Settlement"] } } },
      { $group: { _id: null, pendingPayout: { $sum: "$amount" } } },
    ]);
    const pendingPayout = agg[0]?.pendingPayout || 0;
    if (pendingPayout <= 0) {
      return res.status(400).json({ success: false, message: "Nothing pending for this seller" });
    }
    const transaction = await Transaction.create({
      seller: sellerId,
      type: "Settlement",
      amount: -pendingPayout,
      note: "Payout settled by admin",
    });
    res.json({ success: true, transaction, amountPaid: pendingPayout });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
