const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    referenceImages: [String],
    status: {
      type: String,
      enum: ["Pending", "Quoted", "Accepted", "Rejected", "InProgress", "Completed"],
      default: "Pending",
    },
    budget: { type: Number, min: 0 },
    quotedPrice: { type: Number, min: 0 },
    estimatedDays: { type: Number, min: 1 },
    adminNote: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);
