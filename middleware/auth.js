function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  req.user = req.session.user;
  next();
}

module.exports = {
  isLoggedIn
};
