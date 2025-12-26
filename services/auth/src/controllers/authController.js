import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { validate, schemas } from '@gocart/shared';
import { sendSuccess } from '@gocart/shared';
import { ConflictError, NotFoundError, AuthenticationError } from '@gocart/shared';
import tokenService from '../services/tokenService.js';
import sessionService from '../services/sessionService.js';
import emailService from '../services/emailService.js';
import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

const prisma = new PrismaClient();

// Register user
export const register = async (req, res) => {
  try {
    const { email, password, name, role = 'customer' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role
      }
    });

    // Generate email verification token
    const verificationToken = tokenService.generateEmailVerificationToken(user.id);

    // Store verification token
    await prisma.token.create({
      data: {
        userId: user.id,
        type: 'email_verification',
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Send verification email
    try {
      await emailService.sendEmailVerification(user, verificationToken);
    } catch (emailError) {
      logger.warn('Failed to send verification email', {
        userId: user.id,
        error: emailError.message
      });
      // Don't fail registration if email fails
    }

    // Publish user created event (optional)
    try {
      await eventPublisher.publish(EventTypes.USER_CREATED, {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (eventError) {
      logger.warn('Failed to publish user created event', {
        userId: user.id,
        error: eventError.message
      });
      // Don't fail registration if event publishing fails
    }

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: false
      },
      message: 'Registration successful. Please check your email to verify your account.'
    }, 'User registered successfully', 201);

  } catch (error) {
    logger.error('Registration failed', { error: error.message, email: req.body.email });
    throw error;
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AuthenticationError('Please verify your email before logging in');
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = tokenService.generateRefreshToken(user);

    // Create session
    const { sessionId, sessionToken } = await sessionService.createSession(user, 'web', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Update user last login (optional)
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      sessionId
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified
      },
      tokens: {
        accessToken,
        refreshToken,
        sessionToken
      },
      sessionId
    }, 'Login successful');

  } catch (error) {
    logger.error('Login failed', { error: error.message, email: req.body.email });
    throw error;
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      try {
        const decoded = tokenService.verifyAccessToken(token);
        // Destroy all user sessions
        await sessionService.destroyUserSessions(decoded.userId);

        logger.info('User logged out', { userId: decoded.userId });
      } catch (tokenError) {
        logger.warn('Invalid token during logout', { error: tokenError.message });
      }
    }

    sendSuccess(res, null, 'Logged out successfully');

  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    throw error;
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate new tokens
    const newAccessToken = tokenService.generateAccessToken(user);
    const newRefreshToken = tokenService.generateRefreshToken(user);

    logger.info('Token refreshed', { userId: user.id });

    sendSuccess(res, {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    }, 'Token refreshed successfully');

  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    throw error;
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    sendSuccess(res, { user }, 'User data retrieved successfully');

  } catch (error) {
    logger.error('Get user failed', { error: error.message, userId: req.user?.id });
    throw error;
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name: name.trim() }),
        ...(email && { email: email.toLowerCase() })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Publish user updated event
    await eventPublisher.publish(EventTypes.USER_UPDATED, {
      userId: updatedUser.id,
      changes: { name, email }
    });

    logger.info('User profile updated', {
      userId: updatedUser.id,
      changes: { name: !!name, email: !!email }
    });

    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');

  } catch (error) {
    logger.error('Profile update failed', {
      error: error.message,
      userId: req.user?.id
    });
    throw error;
  }
};
