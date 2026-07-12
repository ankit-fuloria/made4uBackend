// Creates ONE brand-new additive test Admin account for local order-lifecycle testing.
// Does not read, modify, or touch any existing user document.
const mongoose = require("mongoose");
require("dotenv").config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require("../src/models/User");
  const email = "claude-test-admin@example.com";
  const already = await User.exists({ emailId: email });
  if (already) {
    console.log("Test admin already exists, skipping creation.");
    process.exit(0);
  }
  await User.create({
    username: "claudetestadmin",
    emailId: email,
    phone: 9000000002,
    password: "TestPass123",
    typeOfUser: "Admin",
  });
  console.log("Created new test admin account:", email);
  process.exit(0);
}).catch((e) => { console.error(e); process.exit(1); });
