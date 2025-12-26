const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  becomeArtist,
  getUserById,
} = require('../controllers/userController');
const authenticate = require('../middleware/auth');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me', authenticate, updateProfile);

/**
 * @route   PUT /api/users/me/password
 * @desc    Change password
 * @access  Private
 */
router.put('/me/password', authenticate, changePassword);

/**
 * @route   POST /api/users/become-artist
 * @desc    Register as artist
 * @access  Private
 */
router.post('/become-artist', authenticate, becomeArtist);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (public profile)
 * @access  Public
 */
router.get('/:id', getUserById);

module.exports = router;

