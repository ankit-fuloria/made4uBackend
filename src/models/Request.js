const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema(
  {
    author: { type: String, enum: ["admin", "user"], required: true },
    description: { type: String, required: true },
    images: [String],
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

const requestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    giftType: { type: String, required: true, trim: true },
    referenceImages: [String],
    referenceDocument: String,
    status: {
      type: String,
      enum: ["Pending", "Quoted", "Accepted", "Rejected", "InProgress", "Completed"],
      default: "Pending",
    },
    budget: { type: Number, min: 0 },
    quotedPrice: { type: Number, min: 0 },
    estimatedDays: { type: Number, min: 1 },
    adminNote: String,
    proposals: [proposalSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
