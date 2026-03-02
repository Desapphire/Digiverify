const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const uploadDir = path.join(__dirname, "..", "uploads");

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Create local disk storage engine
const createStorage = () => {
  ensureUploadDir();

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return cb(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        cb(null, filename);
      });
    },
  });
};

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF, XLS, XLSX, TXT"), false);
  }
};

// Create multer upload instance
const createUpload = () => {
  const storage = createStorage();
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 16 * 1024 * 1024, // 16MB max file size
    },
  });
};

module.exports = { createUpload };
