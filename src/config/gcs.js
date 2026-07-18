const path = require("path");
const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: path.join(__dirname, "..", "..", process.env.GCS_KEY_FILE),
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
// Every upload from this app lives under this prefix, so the bucket can be
// shared safely with other projects without file collisions.
const ROOT_FOLDER = process.env.GCS_FOLDER || "project";

module.exports = { bucket, ROOT_FOLDER };
