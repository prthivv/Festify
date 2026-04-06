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
const allowedRoles = ["Admin", "Coordinator", "Participant", "Volunteer"];

function createTokenForUser(user) {
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

  return {
    token,
    user: userPayload,
  };
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "").trim();

    if (!normalizedName || !normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({
        error: "Name, email, password, and role are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long.",
      });
    }

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        error: `Role must be one of: ${allowedRoles.join(", ")}.`,
      });
    }

    const roleResult = await db.query(
      `SELECT role_id, role_name
       FROM Role
       WHERE role_name = $1`,
      [normalizedRole],
    );

    if (roleResult.rowCount === 0) {
      return res.status(400).json({
        error: "Selected role does not exist.",
      });
    }

    const passwordHash = await argon2.hash(password);

    let createdUser;

    try {
      const insertResult = await db.query(
        `INSERT INTO "User" (name, email, password_hash, role_id)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id, name, email, role_id, created_at`,
        [normalizedName, normalizedEmail, passwordHash, roleResult.rows[0].role_id],
      );

      createdUser = {
        ...insertResult.rows[0],
        role_name: roleResult.rows[0].role_name,
      };
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "An account with that email already exists.",
        });
      }

      throw error;
    }

    const authPayload = createTokenForUser(createdUser);

    res.status(201).json({
      message: "Registration successful.",
      ...authPayload,
    });
  }),
);

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

    const authPayload = createTokenForUser(user);

    res.json({
      message: "Login successful.",
      ...authPayload,
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
