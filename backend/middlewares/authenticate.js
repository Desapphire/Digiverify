/**
 * JWT Authentication Middleware.
 * Extracts Bearer token, verifies, and attaches user to req.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Authentication required. Provide Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, env.JWT.secret);
        req.user = {
            id: decoded.id,
            walletAddress: decoded.walletAddress,
            role: decoded.role,
            email: decoded.email,
        };
        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Token expired. Please re-authenticate.', 401));
        }
        return next(new AppError('Invalid token.', 401));
    }
};

module.exports = authenticate;
