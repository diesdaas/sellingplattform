import { PrismaClient } from '@prisma/client';
import { sendSuccess } from '@gocart/shared';
import { NotFoundError, AuthenticationError } from '@gocart/shared';
import tokenService from '../services/tokenService.js';
import emailService from '../services/emailService.js';
import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

const prisma = new PrismaClient();

// Verify email with token
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      throw new AuthenticationError('Verification token is required');
    }

    // Verify token
    const decoded = tokenService.verifyEmailToken(token);

    // Find and verify token in database
    const dbToken = await prisma.token.findFirst({
      where: {
        token: token,
        type: 'email_verification',
        userId: decoded.userId,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!dbToken) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    // Update user as verified
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        isVerified: true,
        emailVerifiedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true
      }
    });

    // Mark token as used
    await prisma.token.update({
      where: { id: dbToken.id },
      data: { usedAt: new Date() }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      logger.warn('Failed to send welcome email', {
        userId: user.id,
        error: emailError.message
      });
      // Don't fail verification if welcome email fails
    }

    // Publish user verified event
    await eventPublisher.publish(EventTypes.USER_VERIFIED, {
      userId: user.id,
      email: user.email,
      verifiedAt: new Date().toISOString()
    });

    logger.info('Email verified successfully', {
      userId: user.id,
      email: user.email
    });

    sendSuccess(res, {
      user,
      message: 'Email verified successfully! You can now log in to your account.'
    }, 'Email verified successfully');

  } catch (error) {
    logger.error('Email verification failed', {
      error: error.message,
      token: req.query.token?.substring(0, 20) + '...'
    });
    throw error;
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AuthenticationError('Email is required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isVerified) {
      throw new AuthenticationError('Email is already verified');
    }

    // Check for existing verification token
    const existingToken = await prisma.token.findFirst({
      where: {
        userId: user.id,
        type: 'email_verification',
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    let verificationToken;

    if (existingToken) {
      // Use existing token
      verificationToken = existingToken.token;
    } else {
      // Generate new token
      verificationToken = tokenService.generateEmailVerificationToken(user.id);

      // Store new token
      await prisma.token.create({
        data: {
          userId: user.id,
          type: 'email_verification',
          token: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });
    }

    // Send verification email
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (emailError) {
      logger.error('Failed to resend verification email', {
        userId: user.id,
        error: emailError.message
      });
      throw new Error('Failed to send verification email. Please try again later.');
    }

    logger.info('Verification email resent', {
      userId: user.id,
      email: user.email
    });

    sendSuccess(res, null, 'Verification email sent successfully. Please check your inbox.');

  } catch (error) {
    logger.error('Resend verification failed', {
      error: error.message,
      email: req.body.email
    });
    throw error;
  }
};

// Check verification status
export const checkVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        emailVerifiedAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    sendSuccess(res, {
      isVerified: user.isVerified,
      verifiedAt: user.emailVerifiedAt,
      email: user.email
    }, 'Verification status retrieved');

  } catch (error) {
    logger.error('Check verification status failed', {
      error: error.message,
      userId: req.user?.id
    });
    throw error;
  }
};
