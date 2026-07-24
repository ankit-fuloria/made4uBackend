const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    emoji: { type: String, default: "✨" },
    backgroundColor: { type: String, default: "#2D1060" },
    ctaLabel: { type: String, default: "📝  Request" },
    linkType: { type: String, enum: ["request", "category", "url"], default: "request" },
    linkValue: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
