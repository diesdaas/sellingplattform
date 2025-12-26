const AppError = require('../utils/AppError');

/**
 * Admin Check Middleware
 * Must be used after authenticate middleware
 * Checks if user has admin role
 */
function adminCheck(req, res, next) {
  // Ensure authenticate middleware was called first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
}

module.exports = adminCheck;


