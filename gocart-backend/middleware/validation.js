const AppError = require('../utils/AppError');

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {{valid: boolean, message: string}} Validation result
 */
function validatePassword(password) {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  return { valid: true, message: 'Password is valid' };
}

/**
 * Validate pagination query parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {{page: number, limit: number}} Normalized pagination
 */
function validatePagination(page, limit) {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;

  if (pageNum < 1) {
    throw new AppError('Page must be at least 1', 400);
  }

  if (limitNum < 1 || limitNum > 100) {
    throw new AppError('Limit must be between 1 and 100', 400);
  }

  return { page: pageNum, limit: limitNum };
}

module.exports = {
  validateEmail,
  validatePassword,
  validatePagination,
};

