const Settings = require("../models/Settings");

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const allowed = [
      "appName", "currency", "currencySymbol", "taxRatePercent",
      "commissionRatePercent", "supportEmail", "supportPhone",
      "freeDeliveryMinOrderValue", "deliveryCharge", "codCharge",
    ];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const settings = await Settings.getSingleton();
    Object.assign(settings, updates);
    await settings.save();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
