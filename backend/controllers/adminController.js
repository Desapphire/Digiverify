const User = require("../models/User");
const Document = require("../models/Document");

// Get analytics (admin only)
const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const verifiedDocuments = await Document.countDocuments({ status: "verified" });
    const pendingDocuments = await Document.countDocuments({ status: "pending" });
    const rejectedDocuments = await Document.countDocuments({ status: "rejected" });

    return res.status(200).json({
      success: true,
      message: "Analytics fetched successfully.",
      data: {
        totalUsers,
        totalDocuments,
        verifiedDocuments,
        pendingDocuments,
        rejectedDocuments,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching analytics.",
      error: err.message,
    });
  }
};

module.exports = { getAnalytics };
