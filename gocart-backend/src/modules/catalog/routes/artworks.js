// Artworks routes
import express from 'express';
import { asyncHandler, schemas, validate, validateQuery } from '@gocart/shared';
import {
  listArtworks,
  getArtwork,
  createArtwork,
  updateArtwork,
  deleteArtwork
} from '../controllers/artworkController.js';

const router = express.Router();

// GET /api/catalog/artworks - List artworks
router.get('/', validateQuery(schemas.catalog.artworkSearch), asyncHandler(listArtworks));

// GET /api/catalog/artworks/:id - Get artwork by ID
router.get('/:id', asyncHandler(getArtwork));

// POST /api/catalog/artworks - Create artwork (protected)
router.post('/', validate(schemas.artwork.create), asyncHandler(createArtwork));

// PUT /api/catalog/artworks/:id - Update artwork (protected)
router.put('/:id', validate(schemas.artwork.update), asyncHandler(updateArtwork));

// DELETE /api/catalog/artworks/:id - Delete artwork (protected)
router.delete('/:id', asyncHandler(deleteArtwork));

export default router;






