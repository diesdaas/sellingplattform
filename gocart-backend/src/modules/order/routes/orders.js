const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');
const authenticate = require('../middleware/auth');

/**
 * @route   POST /api/orders
 * @desc    Create order from cart
 * @access  Private
 */
router.post('/', authenticate, createOrder);

/**
 * @route   GET /api/orders
 * @desc    Get user's orders
 * @access  Private
 */
router.get('/', authenticate, getOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get('/:id', authenticate, getOrder);

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Update order status (vendor/admin only)
 * @access  Private
 */
router.put('/:id/status', authenticate, updateOrderStatus);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Cancel order
 * @access  Private
 */
router.post('/:id/cancel', authenticate, cancelOrder);

module.exports = router;






