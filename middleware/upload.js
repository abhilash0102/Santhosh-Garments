// middleware/upload.js
// Multer — stores files in memory so we can stream to Supabase Storage
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB max
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only JPEG/PNG/WEBP images allowed'), ok);
  }
});

module.exports = upload;
