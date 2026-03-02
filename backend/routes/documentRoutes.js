const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/isAuth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { createUpload } = require("../config/upload");
const {
  uploadDocument,
  downloadFile,
  getOwnDocuments,
  getPendingDocuments,
  verifyDocument,
  rejectDocument,
  getAllDocuments,
  deleteDocument,
} = require("../controllers/documentController");

// Create multer upload middleware
const upload = createUpload();

// Owner routes
router.post(
  "/upload",
  isAuth,
  roleMiddleware("owner"),
  upload.single("file"),
  uploadDocument
);
router.get("/my", isAuth, roleMiddleware("owner"), getOwnDocuments);
router.delete("/:id", isAuth, roleMiddleware("owner"), deleteDocument);

// File download/view (accessible by owner, verifier, admin)
router.get(
  "/file/:id",
  isAuth,
  roleMiddleware("owner", "verifier", "admin"),
  downloadFile
);

// Verifier routes
router.get("/pending", isAuth, roleMiddleware("verifier"), getPendingDocuments);
router.put("/verify/:id", isAuth, roleMiddleware("verifier"), verifyDocument);
router.put("/reject/:id", isAuth, roleMiddleware("verifier"), rejectDocument);

// Admin routes
router.get("/all", isAuth, roleMiddleware("admin"), getAllDocuments);

module.exports = router;
