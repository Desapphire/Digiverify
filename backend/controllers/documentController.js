const fs = require("fs");
const path = require("path");
const Document = require("../models/Document");

// Upload document (owner only) - file is already uploaded by multer middleware
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    const { title, description } = req.body;

    if (!title) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const document = await Document.create({
      title,
      description: description || "",
      filename: req.file.filename,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      owner: req.session.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      data: document,
    });
  } catch (err) {
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (deleteErr) {
        console.error("Error deleting file:", deleteErr);
      }
    }
    return res.status(500).json({
      success: false,
      message: "Server error uploading document.",
      error: err.message,
    });
  }
};

// Download/View file
const downloadFile = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const userRole = req.session.user.role;
    const userId = req.session.user.id;

    if (userRole === "owner" && document.owner !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const absoluteFilePath = path.resolve(document.filePath);
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found in storage.",
      });
    }

    res.set("Content-Type", document.contentType);
    res.set("Content-Disposition", `inline; filename="${document.originalName}"`);
    return res.sendFile(absoluteFilePath);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error downloading file.",
      error: err.message,
    });
  }
};

// Get own documents (owner only)
const getOwnDocuments = async (req, res) => {
  try {
    const documents = await Document.getByOwner(req.session.user.id);

    return res.status(200).json({
      success: true,
      message: "Documents fetched successfully.",
      data: documents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching documents.",
      error: err.message,
    });
  }
};

// Get pending documents (verifier only)
const getPendingDocuments = async (req, res) => {
  try {
    const documents = await Document.getPending();

    return res.status(200).json({
      success: true,
      message: "Pending documents fetched successfully.",
      data: documents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching pending documents.",
      error: err.message,
    });
  }
};

// Verify document (verifier only)
const verifyDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Document has already been processed.",
      });
    }

    const updatedDocument = await Document.updateStatus(req.params.id, "verified", req.session.user.id);

    return res.status(200).json({
      success: true,
      message: "Document verified successfully.",
      data: updatedDocument,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error verifying document.",
      error: err.message,
    });
  }
};

// Reject document (verifier only)
const rejectDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    if (document.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Document has already been processed.",
      });
    }

    const updatedDocument = await Document.updateStatus(req.params.id, "rejected", req.session.user.id);

    return res.status(200).json({
      success: true,
      message: "Document rejected successfully.",
      data: updatedDocument,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error rejecting document.",
      error: err.message,
    });
  }
};

// Get all documents (admin only)
const getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.getAll();

    return res.status(200).json({
      success: true,
      message: "All documents fetched successfully.",
      data: documents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching all documents.",
      error: err.message,
    });
  }
};

// Delete document (owner only - can only delete their own PENDING documents)
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // Only owner can delete their own documents
    if (document.owner !== req.session.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own documents.",
      });
    }

    // Bug #9 — Only pending documents can be deleted
    if (document.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending documents can be deleted. Verified or rejected documents cannot be removed.",
      });
    }

    // Delete local file
    try {
      const absoluteFilePath = path.resolve(document.filePath);
      if (fs.existsSync(absoluteFilePath)) {
        fs.unlinkSync(absoluteFilePath);
      }
    } catch (deleteErr) {
      console.error("Error deleting file from storage:", deleteErr);
    }

    await Document.deleteById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error deleting document.",
      error: err.message,
    });
  }
};

module.exports = {
  uploadDocument,
  downloadFile,
  getOwnDocuments,
  getPendingDocuments,
  verifyDocument,
  rejectDocument,
  getAllDocuments,
  deleteDocument,
};
