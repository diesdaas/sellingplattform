const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllVendors,
  updateVendorStatus,
  getAllOrders,
  updateOrderStatus,
  getPlatformAnalytics,
} = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const adminCheck = require('../middleware/adminCheck');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(adminCheck);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private (Admin only)
 */
router.get('/users', getAllUsers);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.put('/users/:id/role', updateUserRole);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/users/:id', deleteUser);

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors
 * @access  Private (Admin only)
 */
router.get('/vendors', getAllVendors);

/**
 * @route   PUT /api/admin/vendors/:id/status
 * @desc    Update vendor status
 * @access  Private (Admin only)
 */
router.put('/vendors/:id/status', updateVendorStatus);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders
 * @access  Private (Admin only)
 */
router.get('/orders', getAllOrders);

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin only)
 */
router.put('/orders/:id/status', updateOrderStatus);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get platform analytics
 * @access  Private (Admin only)
 */
router.get('/analytics', getPlatformAnalytics);

module.exports = router;
