const express = require('express');
const router = express.Router();
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  syncWithProdigi,
  getProdigiSKUs,
} = require('../controllers/productController');
const {
  addReview,
  getProductReviews,
} = require('../controllers/reviewController');
const authenticate = require('../middleware/auth');

/**
 * @route   GET /api/products
 * @desc    List products with filtering
 * @access  Public
 */
router.get('/', listProducts);

/**
 * @route   GET /api/products/prodigi/skus
 * @desc    Get available Prodigi SKUs
 * @access  Public
 */
router.get('/prodigi/skus', getProdigiSKUs);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', getProduct);

/**
 * @route   POST /api/products
 * @desc    Create product (protected, artist only)
 * @access  Private
 */
router.post('/', authenticate, createProduct);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product (protected, owner only)
 * @access  Private
 */
router.put('/:id', authenticate, updateProduct);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (protected, owner only)
 * @access  Private
 */
router.delete('/:id', authenticate, deleteProduct);

/**
 * @route   POST /api/products/:id/sync-prodigi
 * @desc    Sync product with Prodigi (get pricing)
 * @access  Private
 */
router.post('/:id/sync-prodigi', authenticate, syncWithProdigi);

/**
 * @route   POST /api/products/:productId/reviews
 * @desc    Add review for a product
 * @access  Private
 */
router.post('/:productId/reviews', authenticate, addReview);

/**
 * @route   GET /api/products/:productId/reviews
 * @desc    Get product reviews
 * @access  Public
 */
router.get('/:productId/reviews', getProductReviews);

module.exports = router;

