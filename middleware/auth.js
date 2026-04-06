const jwt = require("jsonwebtoken");

const jwtSecret =
  process.env.JWT_SECRET ||
  "replace-this-with-a-long-random-secret-before-deploying";

function isLoggedIn(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token."
    });
  }
}

module.exports = {
  isLoggedIn
};
