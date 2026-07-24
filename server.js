require("dotenv").config();
const http = require("http");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const connectDB = require("./src/config/db");
const Request = require("./src/models/Request");

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
const couponRoutes = require("./src/routes/coupon");
const bannerRoutes = require("./src/routes/banner");

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
app.use("/api/coupons", couponRoutes);
app.use("/api/banners", bannerRoutes);

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

const httpServer = http.createServer(app);

// Engine.IO bypasses Express's own middleware chain (including the cors()
// call above), so it needs its own CORS config.
const io = new Server(httpServer, { cors: { origin: "*" } });
app.set("io", io);

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET || "secret");
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("join:request", async (requestId) => {
    try {
      const filter =
        socket.user.typeOfUser === "Admin"
          ? { _id: requestId }
          : { _id: requestId, user: socket.user.id };
      const exists = await Request.exists(filter);
      if (exists) socket.join(`request:${requestId}`);
    } catch {
      // Malformed id or similar — just don't join, no need to crash the socket.
    }
  });

  socket.on("leave:request", (requestId) => socket.leave(`request:${requestId}`));
});

httpServer.listen(PORT, () => {
  console.log(`Heart Made Memo server running on port ${PORT}`);
});
