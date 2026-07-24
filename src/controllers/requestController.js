const Request = require("../models/Request");

exports.createRequest = async (req, res) => {
  try {
    const { title, description, giftType, budget } = req.body;
    if (!title || !description || !giftType) {
      return res.status(400).json({ success: false, message: "Title, description and gift type are required" });
    }
    const images = req.files?.images ? req.files.images.map((f) => f.publicUrl) : [];
    const referenceDocument = req.files?.pdf?.[0]?.publicUrl;
    const request = await Request.create({
      user: req.user.id,
      title,
      description,
      giftType,
      referenceImages: images,
      ...(referenceDocument && { referenceDocument }),
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
      .select("-proposals")
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
    const isAdmin = req.user.typeOfUser === "Admin";
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };
    const request = await Request.findOne(filter).populate("user", "username phone emailId");
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// A proposal from either side — alternates strictly starting with admin.
// Uses an atomic findOneAndUpdate with the turn/status check folded into the
// query filter itself (not a separate read-then-check-then-save) so two
// concurrent submits can't both pass the check and both push.
exports.addProposal = async (req, res) => {
  try {
    const { description, price } = req.body;
    if (!description || price === undefined || price === null) {
      return res.status(400).json({ success: false, message: "Description and price are required" });
    }
    const images = req.files ? req.files.map((f) => f.publicUrl) : [];
    const author = req.user.typeOfUser === "Admin" ? "admin" : "user";
    const ownershipFilter = author === "admin" ? {} : { user: req.user.id };
    const filter = {
      _id: req.params.id,
      ...ownershipFilter,
      status: { $nin: ["Accepted", "Rejected", "InProgress", "Completed"] },
      $expr: {
        $cond: {
          if: { $eq: [{ $size: "$proposals" }, 0] },
          then: { $eq: [author, "admin"] },
          else: { $ne: [{ $arrayElemAt: ["$proposals.author", -1] }, author] },
        },
      },
    };
    const request = await Request.findOneAndUpdate(
      filter,
      {
        $push: { proposals: { author, description, images, price: Number(price) } },
        $set: { status: "Quoted" },
      },
      { new: true }
    ).populate("user", "username phone emailId");
    if (!request) {
      return res.status(409).json({ success: false, message: "Not your turn, or this request can no longer be responded to" });
    }
    req.app.get("io")?.to(`request:${request._id}`).emit("request:update", request);
    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.acceptProposal = async (req, res) => {
  try {
    const author = req.user.typeOfUser === "Admin" ? "admin" : "user";
    const ownershipFilter = author === "admin" ? {} : { user: req.user.id };
    const filter = {
      _id: req.params.id,
      ...ownershipFilter,
      status: { $nin: ["Accepted", "Rejected", "InProgress", "Completed"] },
      $expr: {
        $and: [
          { $gt: [{ $size: "$proposals" }, 0] },
          { $ne: [{ $arrayElemAt: ["$proposals.author", -1] }, author] },
        ],
      },
    };
    const request = await Request.findOneAndUpdate(
      filter,
      { $set: { status: "Accepted" } },
      { new: true }
    ).populate("user", "username phone emailId");
    if (!request) {
      return res.status(409).json({ success: false, message: "Nothing to accept, or you sent the latest proposal yourself" });
    }
    req.app.get("io")?.to(`request:${request._id}`).emit("request:update", request);
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
      .select("-proposals")
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
