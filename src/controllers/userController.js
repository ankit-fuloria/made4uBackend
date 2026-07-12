const User = require("../models/User");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const match = await user.matchPassword(currentPassword);
    if (!match) return res.status(401).json({ success: false, message: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ["username", "emailId", "phone"];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (req.body.isDefault) {
      user.address.forEach((a) => (a.isDefault = false));
    }
    user.address.push(req.body);
    await user.save();
    res.json({ success: true, address: user.address });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.address = user.address.filter((a) => a._id.toString() !== req.params.addressId);
    await user.save();
    res.json({ success: true, address: user.address });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wallet");
    res.json({ success: true, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, typeOfUser } = req.query;
    const filter = {};
    if (typeOfUser) filter.typeOfUser = typeOfUser;
    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(filter);
    res.json({ success: true, users, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.creditWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { wallet: amount } },
      { new: true }
    );
    res.json({ success: true, wallet: user.wallet });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
