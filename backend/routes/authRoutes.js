const express = require("express");
const router = express.Router();
const { register, login, logout, getCurrentUser } = require("../controllers/authController");
const isAuth = require("../middleware/isAuth");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuth, logout);
router.get("/me", isAuth, getCurrentUser);

module.exports = router;
