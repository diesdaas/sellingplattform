const { query } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Get portfolio by artist ID (public)
 * GET /api/portfolios/:artistId
 */
async function getPortfolio(req, res, next) {
  try {
    const { artistId } = req.params;

    const artistResult = await query(
      'SELECT id, name, image, "isArtist" FROM "User" WHERE id = $1',
      [artistId]
    );

    if (artistResult.rows.length === 0 || !artistResult.rows[0].isArtist) {
      throw new AppError('Artist not found', 404);
    }

    const artist = artistResult.rows[0];

    const portfolioResult = await query(
      'SELECT * FROM "Portfolio" WHERE "artistId" = $1',
      [artistId]
    );

    if (portfolioResult.rows.length === 0) {
      throw new AppError('Portfolio not found', 404);
    }

    const portfolio = portfolioResult.rows[0];

    // Get artworks
    const artworksResult = await query(
      'SELECT * FROM "Artwork" WHERE "portfolioId" = $1 AND "isPublic" = true ORDER BY "createdAt" DESC',
      [portfolio.id]
    );

    portfolio.artworks = artworksResult.rows;

    res.status(200).json({
      success: true,
      data: { artist, portfolio },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get portfolio by username (public)
 * GET /api/portfolios/username/:username
 */
async function getPortfolioByUsername(req, res, next) {
  try {
    const { username } = req.params;

    const storeResult = await query(
      `SELECT s.*, u.id as "userId", u.name, u.image, u."isArtist"
       FROM "Store" s
       JOIN "User" u ON s."userId" = u.id
       WHERE s.username = $1`,
      [username]
    );

    if (storeResult.rows.length === 0 || !storeResult.rows[0].isArtist) {
      throw new AppError('Artist not found', 404);
    }

    const store = storeResult.rows[0];
    const artist = { id: store.userId, name: store.name, image: store.image, isArtist: store.isArtist };

    const portfolioResult = await query(
      'SELECT * FROM "Portfolio" WHERE "artistId" = $1',
      [store.userId]
    );

    if (portfolioResult.rows.length === 0) {
      throw new AppError('Portfolio not found', 404);
    }

    const portfolio = portfolioResult.rows[0];

    const artworksResult = await query(
      'SELECT * FROM "Artwork" WHERE "portfolioId" = $1 AND "isPublic" = true ORDER BY "createdAt" DESC',
      [portfolio.id]
    );

    portfolio.artworks = artworksResult.rows;

    res.status(200).json({
      success: true,
      data: { artist, portfolio },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's portfolio (protected)
 * GET /api/portfolios/me
 */
async function getMyPortfolio(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User is not an artist', 403);
    }

    const portfolioResult = await query(
      'SELECT * FROM "Portfolio" WHERE "artistId" = $1',
      [userId]
    );

    if (portfolioResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { portfolio: null, message: 'Portfolio not created yet' },
      });
    }

    const portfolio = portfolioResult.rows[0];

    const artworksResult = await query(
      'SELECT * FROM "Artwork" WHERE "portfolioId" = $1 ORDER BY "createdAt" DESC',
      [portfolio.id]
    );

    portfolio.artworks = artworksResult.rows;

    res.status(200).json({
      success: true,
      data: { portfolio },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create portfolio (protected, artist only)
 * POST /api/portfolios
 */
async function createPortfolio(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to create a portfolio', 403);
    }

    const { title, bio, coverImage, socialLinks } = req.body;

    if (!title) {
      throw new AppError('Title is required', 400);
    }

    const existingResult = await query(
      'SELECT id FROM "Portfolio" WHERE "artistId" = $1',
      [userId]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('Portfolio already exists. Use update endpoint instead.', 409);
    }

    const result = await query(
      `INSERT INTO "Portfolio" (id, "artistId", title, bio, "coverImage", "socialLinks", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [userId, title, bio || null, coverImage || null, JSON.stringify(socialLinks || {})]
    );

    const portfolio = result.rows[0];
    portfolio.artworks = [];

    res.status(201).json({
      success: true,
      message: 'Portfolio created successfully',
      data: { portfolio },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update portfolio (protected, owner only)
 * PUT /api/portfolios/me
 */
async function updatePortfolio(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to update a portfolio', 403);
    }

    const { title, bio, coverImage, socialLinks } = req.body;

    const existingResult = await query(
      'SELECT id FROM "Portfolio" WHERE "artistId" = $1',
      [userId]
    );

    if (existingResult.rows.length === 0) {
      throw new AppError('Portfolio not found. Create one first.', 404);
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(title);
      paramIndex++;
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex}`);
      params.push(bio);
      paramIndex++;
    }
    if (coverImage !== undefined) {
      updates.push(`"coverImage" = $${paramIndex}`);
      params.push(coverImage);
      paramIndex++;
    }
    if (socialLinks !== undefined) {
      updates.push(`"socialLinks" = $${paramIndex}`);
      params.push(JSON.stringify(socialLinks));
      paramIndex++;
    }

    updates.push(`"updatedAt" = NOW()`);
    params.push(userId);

    const result = await query(
      `UPDATE "Portfolio" SET ${updates.join(', ')}
       WHERE "artistId" = $${paramIndex}
       RETURNING *`,
      params
    );

    const portfolio = result.rows[0];

    const artworksResult = await query(
      'SELECT * FROM "Artwork" WHERE "portfolioId" = $1 ORDER BY "createdAt" DESC',
      [portfolio.id]
    );

    portfolio.artworks = artworksResult.rows;

    res.status(200).json({
      success: true,
      message: 'Portfolio updated successfully',
      data: { portfolio },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete portfolio (protected, owner only)
 * DELETE /api/portfolios/me
 */
async function deletePortfolio(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to delete a portfolio', 403);
    }

    const result = await query(
      'DELETE FROM "Portfolio" WHERE "artistId" = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Portfolio not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Portfolio deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPortfolio,
  getPortfolioByUsername,
  getMyPortfolio,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
};
