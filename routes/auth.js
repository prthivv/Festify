const express = require("express");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { isLoggedIn } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const jwtSecret =
  process.env.JWT_SECRET ||
  "replace-this-with-a-long-random-secret-before-deploying";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "8h";

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const result = await db.query(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role_id, r.role_name
       FROM "User" u
       JOIN Role r ON r.role_id = u.role_id
       WHERE u.email = $1`,
      [email.trim().toLowerCase()],
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
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
        error: "Invalid email or password.",
      });
    }

    const userPayload = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      role_id: user.role_id,
    };
    const token = jwt.sign(userPayload, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    res.json({
      message: "Login successful.",
      token,
      user: userPayload,
    });
  }),
);

router.post("/logout", isLoggedIn, (_req, res) => {
  res.json({
    message: "Logged out successfully.",
  });
});

router.get("/me", isLoggedIn, (req, res) => {
  res.json({
    user: req.user,
  });
});

module.exports = router;
