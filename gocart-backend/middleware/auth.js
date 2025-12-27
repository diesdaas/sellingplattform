import { verifyToken } from '../utils/jwt.js';
import { query } from '../config/database-pg.js';
import AppError from '../utils/AppError.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export default async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Also check X-User-ID header if coming from Gateway
      const gatewayUserId = req.headers['x-user-id'];
      if (gatewayUserId) {
        const userResult = await query(
          'SELECT id, email, name, image, role, "isArtist", "createdAt" FROM "User" WHERE id = $1',
          [gatewayUserId]
        );
        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
          return next();
        }
      }
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const userResult = await query(
      'SELECT id, email, name, image, role, "isArtist", "createdAt" FROM "User" WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 401);
    }

    // Attach user to request
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
