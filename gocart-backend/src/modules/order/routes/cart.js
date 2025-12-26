const express = require('express');
const router = express.Router();
const {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const authenticate = require('../middleware/auth');

/**
 * @route   POST /api/cart/add
 * @desc    Add item to cart
 * @access  Private
 */
router.post('/add', authenticate, addToCart);

/**
 * @route   GET /api/cart
 * @desc    Get user's cart
 * @access  Private
 */
router.get('/', authenticate, getCart);

/**
 * @route   PUT /api/cart/:itemId
 * @desc    Update cart item quantity
 * @access  Private
 */
router.put('/:itemId', authenticate, updateCartItem);

/**
 * @route   DELETE /api/cart/:itemId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/:itemId', authenticate, removeCartItem);

/**
 * @route   POST /api/cart/clear
 * @desc    Clear cart
 * @access  Private
 */
router.post('/clear', authenticate, clearCart);

module.exports = router;






