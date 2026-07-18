const Brand = require("../models/Brand");

exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Brand name is required" });
    const logo = req.file ? req.file.publicUrl : undefined;
    const brand = await Brand.create({ name, description, ...(logo && { logo }) });
    res.status(201).json({ success: true, brand });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A brand with this name already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const { name, description } = req.body;
    const brand = await Brand.findByIdAndUpdate(req.params.id, { name, description }, { new: true, runValidators: true });
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    res.json({ success: true, brand });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    await Brand.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Brand deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
