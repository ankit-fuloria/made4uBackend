const path = require("path");
const { bucket, ROOT_FOLDER } = require("../config/gcs");

const uploadBufferToGCS = (file, subfolder) =>
  new Promise((resolve, reject) => {
    const objectName = `${ROOT_FOLDER}/${subfolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const blob = bucket.file(objectName);
    const stream = blob.createWriteStream({ resumable: false, contentType: file.mimetype });
    stream.on("error", reject);
    stream.on("finish", async () => {
      try {
        await blob.makePublic();
        resolve(`https://storage.googleapis.com/${bucket.name}/${objectName}`);
      } catch (err) {
        reject(err);
      }
    });
    stream.end(file.buffer);
  });

// Runs after multer's memoryStorage has parsed the file(s) into req.file /
// req.files. Uploads each buffer to GCS and attaches a public URL as
// `.publicUrl` on the same file object(s) — controllers read that instead
// of building a local `/uploads/...` path.
const gcsUpload = (subfolder) => async (req, res, next) => {
  try {
    if (req.file) {
      req.file.publicUrl = await uploadBufferToGCS(req.file, subfolder);
    }
    if (req.files && req.files.length) {
      // Upload every file concurrently instead of one at a time — with
      // multiple product images this was previously N sequential round
      // trips to GCS (write + makePublic each), which added up past the
      // client's 30s receive timeout. Parallelizing bounds the wall-clock
      // time to the slowest single upload instead of their sum.
      await Promise.all(
        req.files.map(async (file) => {
          file.publicUrl = await uploadBufferToGCS(file, subfolder);
        })
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { gcsUpload };
