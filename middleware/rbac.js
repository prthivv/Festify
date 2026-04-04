function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const sessionUser = req.user || req.session.user;

    if (!sessionUser) {
      return res.status(401).json({
        error: "Authentication required."
      });
    }

    if (!allowedRoles.includes(sessionUser.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}.`
      });
    }

    req.user = sessionUser;
    next();
  };
}

module.exports = {
  requireRole
};
