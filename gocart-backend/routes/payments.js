const express = require('express');
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  webhookHandler,
} = require('../controllers/paymentController');
const authenticate = require('../middleware/auth');

/**
 * @route   POST /api/payments/create-intent
 * @desc    Create payment intent for order
 * @access  Private
 */
router.post('/create-intent', authenticate, createPaymentIntent);

/**
 * @route   POST /api/payments/confirm
 * @desc    Confirm payment
 * @access  Private
 */
router.post('/confirm', authenticate, confirmPayment);

// Webhook route is handled directly in server.js with raw body parser
// This route is kept for documentation purposes but won't be used
// router.post('/webhook', webhookHandler);

module.exports = router;

