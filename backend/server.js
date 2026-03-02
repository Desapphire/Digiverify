const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, ".env") });

const session = require("express-session");
const { connectDB } = require("./config/db");
const sessionConfig = require("./config/session");

const authRoutes = require("./routes/authRoutes");
const documentRoutes = require("./routes/documentRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.56.1:3000"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 5000;

app.use(session(sessionConfig));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ success: true, message: "Role-Based Digital Verification System API" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

