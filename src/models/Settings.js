const mongoose = require("mongoose");

// Singleton document — there is only ever one Settings row.
const settingsSchema = new mongoose.Schema(
  {
    appName: { type: String, default: "Heart Made Memo" },
    currency: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    taxRatePercent: { type: Number, default: 0 },
    commissionRatePercent: { type: Number, default: 10 }, // platform cut on seller sales
    supportEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model("Settings", settingsSchema);
