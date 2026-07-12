const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    type: {
      type: String,
      enum: ["Sale", "Commission", "Settlement", "Refund", "Adjustment"],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credit to seller, negative = debit
    status: { type: String, enum: ["Pending", "Completed"], default: "Completed" },
    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
