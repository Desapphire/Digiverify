/**
 * Role-Based Access Control (RBAC) Middleware.
 * Factory function — returns middleware that checks user's role against allowed roles.
 *
 * Usage: authorize('authority', 'super_admin')
 */

const AppError = require('../utils/AppError');

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Authentication required.', 401));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new AppError(
                    `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
                    403
                )
            );
        }

        return next();
    };
};

module.exports = authorize;
