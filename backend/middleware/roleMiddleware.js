const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to access this resource.",
      });
    }

    return next();
  };
};

module.exports = roleMiddleware;
