import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationError } from '@gocart/shared';

class TokenService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Generate access token
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );
  }

  // Generate refresh token
  generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'refresh'
      },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshExpiresIn }
    );
  }

  // Generate session token (for sessions)
  generateSessionToken(user, device = 'web') {
    const sessionId = uuidv4();
    const sessionToken = jwt.sign(
      {
        sessionId,
        userId: user.id,
        email: user.email,
        role: user.role,
        device,
        type: 'session'
      },
      this.jwtSecret,
      { expiresIn: '30d' } // Sessions last 30 days
    );

    return { sessionId, sessionToken };
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid access token');
      }
      throw error;
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.jwtRefreshSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  // Verify session token
  verifySessionToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Session expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid session');
      }
      throw error;
    }
  }

  // Generate email verification token
  generateEmailVerificationToken(userId) {
    const token = uuidv4();
    const hashedToken = jwt.sign(
      { userId, type: 'email_verification', token },
      this.jwtSecret,
      { expiresIn: '24h' }
    );
    return hashedToken;
  }

  // Generate password reset token
  generatePasswordResetToken(userId) {
    const token = uuidv4();
    const hashedToken = jwt.sign(
      { userId, type: 'password_reset', token },
      this.jwtSecret,
      { expiresIn: '1h' }
    );
    return hashedToken;
  }

  // Verify email token
  verifyEmailToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'email_verification') {
        throw new AuthenticationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired email verification token');
    }
  }

  // Verify password reset token
  verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      if (decoded.type !== 'password_reset') {
        throw new AuthenticationError('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }
  }

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }
}

export default new TokenService();
