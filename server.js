require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/user");
const productRoutes = require("./src/routes/product");
const categoryRoutes = require("./src/routes/category");
const cartRoutes = require("./src/routes/cart");
const wishlistRoutes = require("./src/routes/wishlist");
const orderRoutes = require("./src/routes/order");
const requestRoutes = require("./src/routes/request");
const adminRoutes = require("./src/routes/admin");
const sellerRoutes = require("./src/routes/seller");
const brandRoutes = require("./src/routes/brand");
const settingsRoutes = require("./src/routes/settings");

const app = express();
const PORT = process.env.PORT || 3001;

connectDB();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`MadeForYou server running on port ${PORT}`);
});
