import jwt from 'jsonwebtoken';
import { AuthenticationError } from '@gocart/shared';
import { logger } from '@gocart/shared';

// JWT validation middleware
export const validateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    // Add user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Add token to request for service forwarding
    req.token = token;

    logger.debug('JWT validated successfully', {
      userId: req.user.id,
      role: req.user.role
    });

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    logger.error('JWT validation error', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
      req.token = token;
    }

    next();

  } catch (error) {
    // For optional auth, we don't fail, just continue without user
    logger.debug('Optional auth failed, continuing without user', {
      error: error.message
    });
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Artist or Admin middleware
export const requireArtistOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'artist' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Artist or admin access required',
      code: 'ARTIST_ADMIN_REQUIRED'
    });
  }

  next();
};

// Refresh token validation
export const validateRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');

    req.refreshTokenData = decoded;
    next();

  } catch (error) {
    logger.error('Refresh token validation error', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};
