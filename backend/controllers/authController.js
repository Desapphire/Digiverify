const bcrypt = require("bcrypt");
const User = require("../models/User");

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Bug #6 — Basic input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Bug #3 — Always register as 'owner'; admin/verifier cannot self-register
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during registration.",
      error: err.message,
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    req.session.user = {
      id: user._id,
      role: user.role,
      email: user.email,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during login.",
      error: err.message,
    });
  }
};

// Logout
const logout = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out.",
        });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
      });
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during logout.",
      error: err.message,
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Current user fetched.",
      data: userData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching user.",
      error: err.message,
    });
  }
};

module.exports = { register, login, logout, getCurrentUser };
