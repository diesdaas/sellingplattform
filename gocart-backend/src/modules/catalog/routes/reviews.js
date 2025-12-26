const express = require('express');
const router = express.Router();
const {
  addReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getReview,
} = require('../controllers/reviewController');
const authenticate = require('../middleware/auth');

// Note: Product review routes are handled in products.js
// These routes are for direct review management

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
router.get('/:id', getReview);

/**
 * @route   PUT /api/reviews/:id
 * @desc    Update review
 * @access  Private (owner/admin only)
 */
router.put('/:id', authenticate, updateReview);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete review
 * @access  Private (owner/admin only)
 */
router.delete('/:id', authenticate, deleteReview);

/**
 * @route   POST /api/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post('/:id/helpful', authenticate, markHelpful);

module.exports = router;

