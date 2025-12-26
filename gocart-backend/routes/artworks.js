const express = require('express');
const router = express.Router();
const { getArtwork } = require('../controllers/artworkController');

/**
 * @route   GET /api/artworks/:id
 * @desc    Get artwork by ID (public)
 * @access  Public
 */
router.get('/:id', getArtwork);

module.exports = router;


