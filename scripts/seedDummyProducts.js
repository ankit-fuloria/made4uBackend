require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");

const categories = [
  { name: "Crochet", emoji: "🧶", description: "Hand-crocheted pieces" },
  { name: "Bouquets", emoji: "💐", description: "Fresh and forever bouquets" },
  { name: "Candles", emoji: "🕯️", description: "Scented and decorative candles" },
  { name: "Frames", emoji: "🖼️", description: "Photo frames and wall art" },
  { name: "Hampers", emoji: "🧁", description: "Curated gift hampers" },
  { name: "Keychains", emoji: "🗝️", description: "Custom keychains" },
];

const products = [
  { name: "Daisy Crochet Tote Bag", category: "Crochet", price: 1199, discountedPrice: 899, productType: "customisable", stock: 12, tags: ["bag", "tote"] },
  { name: "Amigurumi Bunny Plush", category: "Crochet", price: 799, productType: "non_customisable", stock: 20, tags: ["plush", "toy"] },
  { name: "Crochet Coaster Set (6pc)", category: "Crochet", price: 549, discountedPrice: 449, productType: "non_customisable", stock: 30, tags: ["home"] },
  { name: "Granny Square Blanket", category: "Crochet", price: 2999, productType: "customize", stock: 4, tags: ["blanket"] },

  { name: "Rose & Eucalyptus Bouquet", category: "Bouquets", price: 1499, discountedPrice: 1299, productType: "non_customisable", stock: 15, tags: ["fresh", "roses"] },
  { name: "Sunflower Surprise Bunch", category: "Bouquets", price: 999, productType: "non_customisable", stock: 18, tags: ["sunflower"] },
  { name: "Everlasting Dried Flower Bouquet", category: "Bouquets", price: 1799, productType: "customisable", stock: 10, tags: ["dried", "forever"] },
  { name: "Mixed Tulip Bouquet", category: "Bouquets", price: 1349, discountedPrice: 1099, productType: "non_customisable", stock: 8, tags: ["tulip"] },

  { name: "Lavender Soy Candle", category: "Candles", price: 449, productType: "non_customisable", stock: 40, tags: ["soy", "lavender"] },
  { name: "Personalised Photo Candle", category: "Candles", price: 699, productType: "customize", stock: 3, tags: ["photo", "custom"] },
  { name: "3-Wick Vanilla Jar Candle", category: "Candles", price: 899, discountedPrice: 749, productType: "non_customisable", stock: 22, tags: ["jar", "vanilla"] },
  { name: "Rose Shaped Scented Candle", category: "Candles", price: 549, productType: "non_customisable", stock: 16, tags: ["rose"] },

  { name: "Engraved Wooden Photo Frame", category: "Frames", price: 799, productType: "customisable", stock: 14, tags: ["wood", "engraved"] },
  { name: "Collage Photo Frame (6 photos)", category: "Frames", price: 999, discountedPrice: 849, productType: "customize", stock: 9, tags: ["collage"] },
  { name: "Minimalist Black Frame Set", category: "Frames", price: 649, productType: "non_customisable", stock: 25, tags: ["set", "black"] },

  { name: "Birthday Celebration Hamper", category: "Hampers", price: 1999, discountedPrice: 1699, productType: "customisable", stock: 6, tags: ["birthday"] },
  { name: "Chocolate Lover's Hamper", category: "Hampers", price: 1599, productType: "non_customisable", stock: 11, tags: ["chocolate"] },
  { name: "New Baby Gift Hamper", category: "Hampers", price: 2299, productType: "request", stock: 5, tags: ["baby"] },

  { name: "Name Initial Keychain", category: "Keychains", price: 299, productType: "customisable", stock: 50, tags: ["initial"] },
  { name: "Couple Matching Keychain Set", category: "Keychains", price: 399, discountedPrice: 349, productType: "customize", stock: 28, tags: ["couple"] },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const catDocs = {};
  for (const c of categories) {
    const doc = await Category.findOneAndUpdate(
      { name: c.name },
      { $setOnInsert: c },
      { upsert: true, new: true }
    );
    catDocs[c.name] = doc;
  }
  console.log(`Categories ready: ${Object.keys(catDocs).join(", ")}`);

  let created = 0;
  for (const p of products) {
    const exists = await Product.findOne({ name: p.name });
    if (exists) continue;
    await Product.create({
      name: p.name,
      description: `${p.name} — handcrafted with care. Made to order, ships in 3-7 working days.`,
      price: p.price,
      discountedPrice: p.discountedPrice,
      category: catDocs[p.category]._id,
      productType: p.productType,
      stock: p.stock,
      tags: p.tags,
      images: [],
      ratings: { average: +(3.8 + Math.random() * 1.2).toFixed(1), count: Math.floor(Math.random() * 150) + 5 },
      isFeatured: Math.random() < 0.35,
    });
    created++;
  }
  console.log(`Products created: ${created} (of ${products.length} requested — duplicates by name skipped)`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
