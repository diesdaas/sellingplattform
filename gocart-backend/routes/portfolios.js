const express = require('express');
const router = express.Router();
const {
  getPortfolio,
  getPortfolioByUsername,
  getMyPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
} = require('../controllers/portfolioController');
const {
  addArtwork,
  getArtwork,
  updateArtwork,
  deleteArtwork,
  getPortfolioArtworks,
} = require('../controllers/artworkController');
const authenticate = require('../middleware/auth');

/**
 * @route   GET /api/portfolios/:artistId
 * @desc    Get portfolio by artist ID (public)
 * @access  Public
 */
router.get('/:artistId', getPortfolio);

/**
 * @route   GET /api/portfolios/username/:username
 * @desc    Get portfolio by username (public)
 * @access  Public
 */
router.get('/username/:username', getPortfolioByUsername);

/**
 * @route   GET /api/portfolios/me
 * @desc    Get current user's portfolio (protected)
 * @access  Private
 */
router.get('/me', authenticate, getMyPortfolio);

/**
 * @route   POST /api/portfolios
 * @desc    Create portfolio (protected, artist only)
 * @access  Private
 */
router.post('/', authenticate, createPortfolio);

/**
 * @route   PUT /api/portfolios/me
 * @desc    Update portfolio (protected, owner only)
 * @access  Private
 */
router.put('/me', authenticate, updatePortfolio);

/**
 * @route   DELETE /api/portfolios/me
 * @desc    Delete portfolio (protected, owner only)
 * @access  Private
 */
router.delete('/me', authenticate, deletePortfolio);

/**
 * @route   GET /api/portfolios/:artistId/artworks
 * @desc    Get all artworks for a portfolio (public)
 * @access  Public
 */
router.get('/:artistId/artworks', getPortfolioArtworks);

/**
 * @route   POST /api/portfolios/me/artworks
 * @desc    Add artwork to portfolio (protected, owner only)
 * @access  Private
 */
router.post('/me/artworks', authenticate, addArtwork);

/**
 * @route   PUT /api/portfolios/artworks/:id
 * @desc    Update artwork (protected, owner only)
 * @access  Private
 */
router.put('/artworks/:id', authenticate, updateArtwork);

/**
 * @route   DELETE /api/portfolios/artworks/:id
 * @desc    Delete artwork (protected, owner only)
 * @access  Private
 */
router.delete('/artworks/:id', authenticate, deleteArtwork);

module.exports = router;


