const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        // Snapshot of the product's seller at order time (null = platform/admin item)
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Ready to Dispatch", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentMethod: { type: String, enum: ["COD", "Wallet", "Online"], default: "COD" },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Pending" },
    orderNote: String,
    shippingCharge: { type: Number, default: 0 },
    courierName: String,
    trackingNumber: String,
    rejectReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
