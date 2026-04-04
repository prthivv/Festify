const express = require("express");
const argon2 = require("argon2");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const result = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role_id, r.role_name
       FROM "User" u
       JOIN Role r ON r.role_id = u.role_id
       WHERE u.email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    let passwordMatches = false;

    try {
      passwordMatches = await argon2.verify(user.password_hash, password);
    } catch (error) {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    req.session.user = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      role_id: user.role_id
    };

    res.json({
      message: "Login successful.",
      user: req.session.user
    });
  })
);

router.post("/logout", isLoggedIn, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    res.clearCookie("connect.sid");
    res.json({
      message: "Logged out successfully."
    });
  });
});

router.get("/me", (req, res) => {
  res.json({
    user: req.session.user || null
  });
});

module.exports = router;
