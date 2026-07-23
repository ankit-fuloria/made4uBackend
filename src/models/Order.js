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
    // Pre-discount sum of item prices. totalAmount (below) is what the
    // customer actually pays — subtotal minus discountAmount.
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    // Snapshot of the code used, so it still reads correctly even if the
    // Coupon doc is later edited or deactivated.
    couponCode: { type: String, default: null },
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
    // "Processing" = customer scanned the UPI QR and tapped Verify, but
    // there's no payment-gateway integration yet — an admin has to manually
    // confirm the payment landed before it becomes "Paid".
    paymentStatus: { type: String, enum: ["Pending", "Processing", "Paid", "Failed", "Refunded"], default: "Pending" },
    orderNote: String,
    shippingCharge: { type: Number, default: 0 },
    codCharge: { type: Number, default: 0 },
    courierName: String,
    trackingNumber: String,
    rejectReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
