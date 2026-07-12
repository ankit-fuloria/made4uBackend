const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "secret");
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.typeOfUser !== "Admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

const sellerOnly = (req, res, next) => {
  if (req.user?.typeOfUser !== "Seller") {
    return res.status(403).json({ success: false, message: "Seller access required" });
  }
  next();
};

const adminOrSeller = (req, res, next) => {
  if (!["Admin", "Seller"].includes(req.user?.typeOfUser)) {
    return res.status(403).json({ success: false, message: "Admin or seller access required" });
  }
  next();
};

module.exports = { protect, adminOnly, sellerOnly, adminOrSeller };
