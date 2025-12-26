const express = require('express');
const router = express.Router();
const {
  getVendorProfile,
  getVendorProfileByUsername,
  getMyVendorProfile,
  registerVendor,
  updateVendorProfile,
  getVendorDashboard,
  getVendorOrders,
  getVendorProducts,
} = require('../controllers/vendorController');
const authenticate = require('../middleware/auth');

/**
 * @route   GET /api/vendors/:id
 * @desc    Get vendor profile by ID (public)
 * @access  Public
 */
router.get('/:id', getVendorProfile);

/**
 * @route   GET /api/vendors/username/:username
 * @desc    Get vendor profile by username (public)
 * @access  Public
 */
router.get('/username/:username', getVendorProfileByUsername);

/**
 * @route   GET /api/vendors/me
 * @desc    Get current vendor's profile (protected)
 * @access  Private
 */
router.get('/me', authenticate, getMyVendorProfile);

/**
 * @route   POST /api/vendors/register
 * @desc    Register as vendor (protected)
 * @access  Private
 */
router.post('/register', authenticate, registerVendor);

/**
 * @route   PUT /api/vendors/me
 * @desc    Update vendor profile (protected, owner only)
 * @access  Private
 */
router.put('/me', authenticate, updateVendorProfile);

/**
 * @route   GET /api/vendors/me/dashboard
 * @desc    Get vendor dashboard analytics (protected, vendor only)
 * @access  Private
 */
router.get('/me/dashboard', authenticate, getVendorDashboard);

/**
 * @route   GET /api/vendors/me/orders
 * @desc    Get vendor's orders (protected, vendor only)
 * @access  Private
 */
router.get('/me/orders', authenticate, getVendorOrders);

/**
 * @route   GET /api/vendors/me/products
 * @desc    Get vendor's products (protected, vendor only)
 * @access  Private
 */
router.get('/me/products', authenticate, getVendorProducts);

module.exports = router;

