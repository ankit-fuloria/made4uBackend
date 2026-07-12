const Request = require("../models/Request");

exports.createRequest = async (req, res) => {
  try {
    const { title, description, budget } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and description are required" });
    }
    const images = req.files ? req.files.map((f) => `/uploads/${f.filename}`) : [];
    const request = await Request.create({
      user: req.user.id,
      title,
      description,
      referenceImages: images,
      ...(budget && { budget: Number(budget) }),
    });
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const requests = await Request.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Request.countDocuments({ user: req.user.id });
    res.json({ success: true, requests, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await Request.findOne({ _id: req.params.id, user: req.user.id });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin
exports.getAllRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const requests = await Request.find(filter)
      .populate("user", "username phone emailId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Request.countDocuments(filter);
    res.json({ success: true, requests, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.quoteRequest = async (req, res) => {
  try {
    const { quotedPrice, estimatedDays, adminNote } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { quotedPrice, estimatedDays, adminNote, status: "Quoted" },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
