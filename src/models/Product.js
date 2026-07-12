const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null },
    // Null = platform/admin-owned product; set for marketplace seller listings
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sku: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
    images: [String],
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: "piece" },
    // Marketplace listing moderation — only relevant for seller-owned products.
    // Platform (admin, seller: null) products are auto-approved.
    approvalStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Approved" },
    productType: {
      type: String,
      enum: ["non_customisable", "customisable", "request", "customize"],
      default: "non_customisable",
      required: true,
    },
    customOptions: [
      {
        name: String,
        type: { type: String, enum: ["text", "color", "size", "select"], default: "select" },
        values: [String],
        isRequired: { type: Boolean, default: true },
      },
    ],
    tags: [String],
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Product", productSchema);
