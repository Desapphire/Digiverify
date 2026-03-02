const express = require("express");
const router = express.Router();
const isAuth = require("../middleware/isAuth");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getAnalytics } = require("../controllers/adminController");

router.get("/analytics", isAuth, roleMiddleware("admin"), getAnalytics);

module.exports = router;
