const { query } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Add artwork to portfolio (protected, owner only)
 * POST /api/portfolios/me/artworks
 */
async function addArtwork(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to add artworks', 403);
    }

    const { title, description, imageUrl, medium, style, year, tags, isPublic } = req.body;

    if (!title || !imageUrl) {
      throw new AppError('Title and imageUrl are required', 400);
    }

    const portfolioResult = await query(
      'SELECT id FROM "Portfolio" WHERE "artistId" = $1',
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      throw new AppError('Portfolio not found. Create a portfolio first.', 404);
    }

    const portfolioId = portfolioResult.rows[0].id;

    const result = await query(
      `INSERT INTO "Artwork" (id, "portfolioId", title, description, "imageUrl", medium, style, year, tags, "isPublic", "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [portfolioId, title, description || null, imageUrl, medium || null, style || null, year || null, tags || [], isPublic !== false]
    );

    res.status(201).json({
      success: true,
      message: 'Artwork added successfully',
      data: { artwork: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get artwork by ID (public)
 * GET /api/artworks/:id
 */
async function getArtwork(req, res, next) {
  try {
    const { id } = req.params;

    const artworkResult = await query(
      `SELECT a.*, p."artistId", u.id as "artistUserId", u.name as "artistName", u.image as "artistImage"
       FROM "Artwork" a
       JOIN "Portfolio" p ON a."portfolioId" = p.id
       JOIN "User" u ON p."artistId" = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (artworkResult.rows.length === 0) {
      throw new AppError('Artwork not found', 404);
    }

    const artwork = artworkResult.rows[0];

    if (!artwork.isPublic && req.user?.id !== artwork.artistId) {
      throw new AppError('Artwork not found', 404);
    }

    // Get products for this artwork
    let products = [];
    try {
      const productsResult = await query(
        'SELECT id, name, price, images, variants FROM "Product" WHERE "artworkId" = $1 AND "inStock" = true',
        [id]
      );
      products = productsResult.rows;
    } catch (e) {
      // Products table might not exist
    }

    res.status(200).json({
      success: true,
      data: {
        artwork: {
          ...artwork,
          portfolio: { artistId: artwork.artistId },
          artist: { id: artwork.artistUserId, name: artwork.artistName, image: artwork.artistImage },
          products,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update artwork (protected, owner only)
 * PUT /api/portfolios/artworks/:id
 */
async function updateArtwork(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to update artworks', 403);
    }

    const artworkResult = await query(
      `SELECT a.*, p."artistId"
       FROM "Artwork" a
       JOIN "Portfolio" p ON a."portfolioId" = p.id
       WHERE a.id = $1`,
      [id]
    );

    if (artworkResult.rows.length === 0) {
      throw new AppError('Artwork not found', 404);
    }

    if (artworkResult.rows[0].artistId !== userId) {
      throw new AppError('You do not have permission to update this artwork', 403);
    }

    const { title, description, imageUrl, medium, style, year, tags, isPublic } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) { updates.push(`title = $${paramIndex}`); params.push(title); paramIndex++; }
    if (description !== undefined) { updates.push(`description = $${paramIndex}`); params.push(description); paramIndex++; }
    if (imageUrl !== undefined) { updates.push(`"imageUrl" = $${paramIndex}`); params.push(imageUrl); paramIndex++; }
    if (medium !== undefined) { updates.push(`medium = $${paramIndex}`); params.push(medium); paramIndex++; }
    if (style !== undefined) { updates.push(`style = $${paramIndex}`); params.push(style); paramIndex++; }
    if (year !== undefined) { updates.push(`year = $${paramIndex}`); params.push(year); paramIndex++; }
    if (tags !== undefined) { updates.push(`tags = $${paramIndex}`); params.push(tags); paramIndex++; }
    if (isPublic !== undefined) { updates.push(`"isPublic" = $${paramIndex}`); params.push(isPublic); paramIndex++; }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    params.push(id);

    const result = await query(
      `UPDATE "Artwork" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Artwork updated successfully',
      data: { artwork: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete artwork (protected, owner only)
 * DELETE /api/portfolios/artworks/:id
 */
async function deleteArtwork(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to delete artworks', 403);
    }

    const artworkResult = await query(
      `SELECT a.*, p."artistId"
       FROM "Artwork" a
       JOIN "Portfolio" p ON a."portfolioId" = p.id
       WHERE a.id = $1`,
      [id]
    );

    if (artworkResult.rows.length === 0) {
      throw new AppError('Artwork not found', 404);
    }

    if (artworkResult.rows[0].artistId !== userId) {
      throw new AppError('You do not have permission to delete this artwork', 403);
    }

    // Check if artwork has products
    let productsCount = 0;
    try {
      const countResult = await query('SELECT COUNT(*) FROM "Product" WHERE "artworkId" = $1', [id]);
      productsCount = parseInt(countResult.rows[0].count);
    } catch (e) {
      // Products table might not exist
    }

    if (productsCount > 0) {
      throw new AppError('Cannot delete artwork that has associated products. Remove products first.', 400);
    }

    await query('DELETE FROM "Artwork" WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Artwork deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all artworks for a portfolio (public, filtered by isPublic)
 * GET /api/portfolios/:artistId/artworks
 */
async function getPortfolioArtworks(req, res, next) {
  try {
    const { artistId } = req.params;
    const { page = 1, limit = 20, isPublic } = req.query;

    const portfolioResult = await query(
      'SELECT id FROM "Portfolio" WHERE "artistId" = $1',
      [artistId]
    );

    if (portfolioResult.rows.length === 0) {
      throw new AppError('Portfolio not found', 404);
    }

    const portfolioId = portfolioResult.rows[0].id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '"portfolioId" = $1';
    const params = [portfolioId];
    let paramIndex = 2;

    if (req.user?.id !== artistId) {
      whereClause += ' AND "isPublic" = true';
    } else if (isPublic !== undefined) {
      whereClause += ` AND "isPublic" = $${paramIndex}`;
      params.push(isPublic === 'true');
      paramIndex++;
    }

    const artworksResult = await query(
      `SELECT * FROM "Artwork" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM "Artwork" WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        artworks: artworksResult.rows,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addArtwork,
  getArtwork,
  updateArtwork,
  deleteArtwork,
  getPortfolioArtworks,
};
