import express from 'express';
import {
  getVendorProfile,
  getVendorProfileByUsername,
  getMyVendorProfile,
  registerVendor,
  updateVendorProfile,
  getVendorDashboard,
  getVendorOrders,
  getVendorProducts,
} from '../controllers/vendorController.js';
import authenticate from '../../../../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/vendor/:id
 * @desc    Get vendor profile by ID (public)
 */
router.get('/:id', getVendorProfile);

/**
 * @route   GET /api/vendor/username/:username
 * @desc    Get vendor profile by username (public)
 */
router.get('/username/:username', getVendorProfileByUsername);

/**
 * @route   GET /api/vendor/me
 * @desc    Get current vendor's profile (protected)
 */
router.get('/me', authenticate, getMyVendorProfile);

/**
 * @route   POST /api/vendor/register
 * @desc    Register as vendor (protected)
 */
router.post('/register', authenticate, registerVendor);

/**
 * @route   PUT /api/vendor/me
 * @desc    Update vendor profile (protected)
 */
router.put('/me', authenticate, updateVendorProfile);

/**
 * @route   GET /api/vendor/me/dashboard
 * @desc    Get vendor dashboard analytics (protected)
 */
router.get('/me/dashboard', authenticate, getVendorDashboard);

/**
 * @route   GET /api/vendor/me/orders
 * @desc    Get vendor's orders (protected)
 */
router.get('/me/orders', authenticate, getVendorOrders);

/**
 * @route   GET /api/vendor/me/products
 * @desc    Get vendor's products (protected)
 */
router.get('/me/products', authenticate, getVendorProducts);

export default router;
