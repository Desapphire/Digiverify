const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool } = require("./db");

const sessionConfig = {
  store: new pgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "default_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
};

module.exports = sessionConfig;
