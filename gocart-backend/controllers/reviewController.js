const { query } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Add review for a product (protected)
 * POST /api/products/:productId/reviews
 */
async function addReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { rating, review, images, orderId } = req.body;

    if (!rating || !review) {
      throw new AppError('Rating and review are required', 400);
    }

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    const productResult = await query('SELECT id FROM "Product" WHERE id = $1', [productId]);

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    // Check if user already reviewed this product
    const existingResult = await query(
      'SELECT id FROM "Rating" WHERE "userId" = $1 AND "productId" = $2',
      [userId, productId]
    );

    if (existingResult.rows.length > 0) {
      throw new AppError('You have already reviewed this product', 409);
    }

    const result = await query(
      `INSERT INTO "Rating" (id, "userId", "productId", "orderId", rating, review, images, helpful, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, 0, NOW())
       RETURNING *`,
      [userId, productId, orderId || '', parseInt(rating, 10), review, images || []]
    );

    await recalculateProductRating(productId);

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: { review: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product reviews (public)
 * GET /api/products/:productId/reviews
 */
async function getProductReviews(req, res, next) {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 20, rating } = req.query;

    const productResult = await query('SELECT id FROM "Product" WHERE id = $1', [productId]);

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '"productId" = $1';
    const params = [productId];
    let paramIndex = 2;

    if (rating) {
      whereClause += ` AND rating = $${paramIndex}`;
      params.push(parseInt(rating, 10));
      paramIndex++;
    }

    const reviewsResult = await query(
      `SELECT r.*, u.name as "userName", u.image as "userImage"
       FROM "Rating" r
       LEFT JOIN "User" u ON r."userId" = u.id
       WHERE ${whereClause}
       ORDER BY r."createdAt" DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM "Rating" WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        reviews: reviewsResult.rows.map(r => ({
          ...r,
          user: { id: r.userId, name: r.userName, image: r.userImage }
        })),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update review (protected, owner only)
 * PUT /api/reviews/:id
 */
async function updateReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { rating, review, images } = req.body;

    const existingResult = await query('SELECT * FROM "Rating" WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    if (existingResult.rows[0].userId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to update this review', 403);
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }
      updates.push(`rating = $${paramIndex}`);
      params.push(parseInt(rating, 10));
      paramIndex++;
    }
    if (review !== undefined) { updates.push(`review = $${paramIndex}`); params.push(review); paramIndex++; }
    if (images !== undefined) { updates.push(`images = $${paramIndex}`); params.push(images); paramIndex++; }

    params.push(id);

    const result = await query(
      `UPDATE "Rating" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    await recalculateProductRating(existingResult.rows[0].productId);

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete review (protected, owner/admin only)
 * DELETE /api/reviews/:id
 */
async function deleteReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const reviewResult = await query('SELECT * FROM "Rating" WHERE id = $1', [id]);

    if (reviewResult.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    if (reviewResult.rows[0].userId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to delete this review', 403);
    }

    const productId = reviewResult.rows[0].productId;

    await query('DELETE FROM "Rating" WHERE id = $1', [id]);

    await recalculateProductRating(productId);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark review as helpful (protected)
 * POST /api/reviews/:id/helpful
 */
async function markHelpful(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE "Rating" SET helpful = helpful + 1 WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: { review: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get review by ID (public)
 * GET /api/reviews/:id
 */
async function getReview(req, res, next) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT r.*, u.name as "userName", u.image as "userImage", p.name as "productName", p.images as "productImages"
       FROM "Rating" r
       LEFT JOIN "User" u ON r."userId" = u.id
       LEFT JOIN "Product" p ON r."productId" = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    const review = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        review: {
          ...review,
          user: { id: review.userId, name: review.userName, image: review.userImage },
          product: { id: review.productId, name: review.productName, images: review.productImages }
        }
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Recalculate product average rating
 */
async function recalculateProductRating(productId) {
  try {
    const ratingsResult = await query('SELECT rating FROM "Rating" WHERE "productId" = $1', [productId]);

    if (ratingsResult.rows.length === 0) {
      await query('UPDATE "Product" SET rating = 0, "reviewCount" = 0 WHERE id = $1', [productId]);
      return;
    }

    const ratings = ratingsResult.rows;
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await query(
      'UPDATE "Product" SET rating = $1, "reviewCount" = $2 WHERE id = $3',
      [Math.round(averageRating * 10) / 10, ratings.length, productId]
    );
  } catch (error) {
    console.error('Error recalculating product rating:', error);
  }
}

module.exports = {
  addReview,
  getProductReviews,
  updateReview,
  deleteReview,
  markHelpful,
  getReview,
};
