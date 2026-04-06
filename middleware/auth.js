const jwt = require("jsonwebtoken");

const jwtSecret =
  process.env.JWT_SECRET ||
  "replace-this-with-a-long-random-secret-before-deploying";

function readBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function isLoggedIn(req, res, next) {
  const token = readBearerToken(req);

  if (!token) {
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

function attachOptionalUser(req, _res, next) {
  const token = readBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch (error) {
    req.user = null;
  }

  next();
}

module.exports = {
  isLoggedIn,
  attachOptionalUser
};
