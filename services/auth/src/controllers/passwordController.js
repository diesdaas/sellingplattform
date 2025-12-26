import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { validate } from '@gocart/shared';
import { sendSuccess } from '@gocart/shared';
import { NotFoundError, AuthenticationError } from '@gocart/shared';
import tokenService from '../services/tokenService.js';
import emailService from '../services/emailService.js';
import { logger } from '@gocart/shared';

const prisma = new PrismaClient();

// Request password reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AuthenticationError('Email is required');
    }

    // Find user (don't reveal if email exists or not for security)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      // Generate password reset token
      const resetToken = tokenService.generatePasswordResetToken(user.id);

      // Store reset token
      await prisma.token.create({
        data: {
          userId: user.id,
          type: 'password_reset',
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        }
      });

      // Send password reset email
      try {
        await emailService.sendPasswordReset(user, resetToken);
        logger.info('Password reset email sent', { userId: user.id, email: user.email });
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          userId: user.id,
          error: emailError.message
        });
        // Still return success to avoid email enumeration
      }
    }

    // Always return success to prevent email enumeration
    sendSuccess(res, null, 'If an account with this email exists, a password reset link has been sent.');

  } catch (error) {
    logger.error('Password reset request failed', {
      error: error.message,
      email: req.body.email
    });
    throw error;
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AuthenticationError('Token and password are required');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AuthenticationError('Password must be at least 8 characters long');
    }

    // Verify token
    const decoded = tokenService.verifyPasswordResetToken(token);

    // Find and verify token in database
    const dbToken = await prisma.token.findFirst({
      where: {
        token: token,
        type: 'password_reset',
        userId: decoded.userId,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!dbToken) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // Mark token as used
    await prisma.token.update({
      where: { id: dbToken.id },
      data: { usedAt: new Date() }
    });

    // Destroy all user sessions for security
    await import('../services/sessionService.js').then(module =>
      module.default.destroyUserSessions(decoded.userId)
    );

    logger.info('Password reset successful', { userId: decoded.userId });

    sendSuccess(res, null, 'Password has been reset successfully. Please log in with your new password.');

  } catch (error) {
    logger.error('Password reset failed', { error: error.message });
    throw error;
  }
};

// Change password (authenticated user)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      throw new AuthenticationError('Current password and new password are required');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new AuthenticationError('New password must be at least 8 characters long');
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new AuthenticationError('New password must be different from current password');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    // Destroy all other sessions except current
    await import('../services/sessionService.js').then(module =>
      module.default.destroyUserSessions(userId)
    );

    logger.info('Password changed successfully', { userId });

    sendSuccess(res, null, 'Password changed successfully. All other sessions have been terminated for security.');

  } catch (error) {
    logger.error('Password change failed', {
      error: error.message,
      userId: req.user?.id
    });
    throw error;
  }
};
