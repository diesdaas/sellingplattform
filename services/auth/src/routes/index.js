import express from 'express';
import Joi from 'joi';
import * as authController from '../controllers/authController.js';
import * as passwordController from '../controllers/passwordController.js';
import * as verificationController from '../controllers/verificationController.js';
import { validate, schemas } from '@gocart/shared';
import { asyncHandler } from '@gocart/shared';
import { logger } from '@gocart/shared';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes (public)
router.post('/register',
  asyncHandler(authController.register)
);

router.post('/login',
  asyncHandler(authController.login)
);

router.post('/logout', asyncHandler(authController.logout));

router.post('/refresh', asyncHandler(authController.refreshToken));

// Password management routes
router.post('/forgot-password', asyncHandler(passwordController.forgotPassword));

router.post('/reset-password',
  validate({
    token: Joi.string().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
  }),
  asyncHandler(passwordController.resetPassword)
);

// Email verification routes
router.get('/verify-email', asyncHandler(verificationController.verifyEmail));

router.post('/resend-verification',
  validate({
    email: Joi.string().email().required()
  }),
  asyncHandler(verificationController.resendVerification)
);

// Protected routes (require authentication - would be handled by gateway)
router.get('/me', asyncHandler(authController.getMe));

router.put('/profile',
  validate(schemas.user.updateProfile),
  asyncHandler(authController.updateProfile)
);

router.put('/password',
  validate({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
  }),
  asyncHandler(passwordController.changePassword)
);

router.get('/verification-status', asyncHandler(verificationController.checkVerificationStatus));

// Request logging middleware for routes
router.use((req, res, next) => {
  logger.info(`Auth route accessed: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

export default router;
