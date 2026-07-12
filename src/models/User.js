const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    emailId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: Number, required: true, unique: true },
    password: { type: String, required: true, select: false },
    typeOfUser: { type: String, enum: ["Customer", "Admin", "Seller"], default: "Customer" },
    // Seller onboarding — set only when typeOfUser === "Seller"
    sellerStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: undefined },
    businessName: { type: String, trim: true },
    businessDescription: { type: String, trim: true },
    storeLogo: { type: String, default: null },
    storeAddress: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },
    wallet: { type: Number, default: 0 },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    address: [
      {
        label: String,
        street: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
      altitude: Number,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
