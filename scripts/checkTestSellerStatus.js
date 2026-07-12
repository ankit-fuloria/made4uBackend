// Read-only check of ONE specific test account's sellerStatus (no other users touched or read).
const mongoose = require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require("../src/models/User");
  const seller = await User.findOne({ emailId: "claude-test-seller@example.com" }).select("username sellerStatus typeOfUser");
  console.log(seller ? JSON.stringify(seller) : "not found");
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
