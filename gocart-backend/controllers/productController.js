const { query } = require('../config/database');
const prodigiService = require('../services/prodigiService');
const AppError = require('../utils/AppError');
const { validatePagination } = require('../middleware/validation');

/**
 * List products with filtering and pagination
 * GET /api/products
 */
async function listProducts(req, res, next) {
  try {
    const { page = 1, limit = 20, category, minPrice, maxPrice, search, artistId, inStock, sortBy = 'createdAt', order = 'desc' } = req.query;
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      whereClause += ` AND p.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (minPrice !== undefined) {
      whereClause += ` AND p.price >= $${paramIndex}`;
      params.push(parseFloat(minPrice));
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      whereClause += ` AND p.price <= $${paramIndex}`;
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (inStock !== undefined) {
      whereClause += ` AND p."inStock" = $${paramIndex}`;
      params.push(inStock === 'true');
      paramIndex++;
    }

    const orderClause = sortBy === 'price' ? `p.price ${order}` : sortBy === 'name' ? `p.name ${order}` : `p."createdAt" ${order}`;

    const productsResult = await query(
      `SELECT p.*, s.id as "storeId", s.name as "storeName", s.username as "storeUsername"
       FROM "Product" p
       LEFT JOIN "Store" s ON p."storeId" = s.id
       WHERE ${whereClause}
       ORDER BY ${orderClause}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM "Product" p WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        products: productsResult.rows.map(p => ({
          ...p,
          store: { id: p.storeId, name: p.storeName, username: p.storeUsername }
        })),
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product by ID
 * GET /api/products/:id
 */
async function getProduct(req, res, next) {
  try {
    const { id } = req.params;

    const productResult = await query(
      `SELECT p.*, s.id as "storeId", s.name as "storeName", s.username as "storeUsername", s.logo as "storeLogo"
       FROM "Product" p
       LEFT JOIN "Store" s ON p."storeId" = s.id
       WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const product = productResult.rows[0];
    product.store = { id: product.storeId, name: product.storeName, username: product.storeUsername, logo: product.storeLogo };

    // Get ratings
    let ratings = [];
    try {
      const ratingsResult = await query(
        `SELECT r.*, u.name as "userName", u.image as "userImage"
         FROM "Rating" r
         LEFT JOIN "User" u ON r."userId" = u.id
         WHERE r."productId" = $1
         ORDER BY r."createdAt" DESC LIMIT 10`,
        [id]
      );
      ratings = ratingsResult.rows.map(r => ({
        ...r,
        user: { id: r.userId, name: r.userName, image: r.userImage }
      }));
    } catch (e) { /* Rating table might not exist */ }

    product.ratings = ratings;

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create product from artwork (protected, artist only)
 * POST /api/products
 */
async function createProduct(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User must be an artist to create products', 403);
    }

    const { artworkId, name, description, category, price, variants, basePrice } = req.body;

    if (!name || !category || !price) {
      throw new AppError('Name, category, and price are required', 400);
    }

    // Get or create store
    let storeResult = await query('SELECT * FROM "Store" WHERE "userId" = $1', [userId]);
    
    let store;
    if (storeResult.rows.length === 0) {
      const createStoreResult = await query(
        `INSERT INTO "Store" (id, "userId", name, username, email, description, address, contact, logo, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, '', '', '', NOW(), NOW())
         RETURNING *`,
        [userId, `${req.user.name}'s Store`, `store-${userId.slice(-8)}`, req.user.email, 'My store']
      );
      store = createStoreResult.rows[0];
    } else {
      store = storeResult.rows[0];
    }

    // Validate artwork if provided
    let imageUrl = null;
    if (artworkId) {
      const artworkResult = await query(
        `SELECT a.*, p."artistId" FROM "Artwork" a JOIN "Portfolio" p ON a."portfolioId" = p.id WHERE a.id = $1`,
        [artworkId]
      );

      if (artworkResult.rows.length === 0) {
        throw new AppError('Artwork not found', 404);
      }

      if (artworkResult.rows[0].artistId !== userId) {
        throw new AppError('You do not have permission to create products from this artwork', 403);
      }

      imageUrl = artworkResult.rows[0].imageUrl;
    }

    const result = await query(
      `INSERT INTO "Product" (id, "artworkId", "storeId", name, description, mrp, price, images, category, "inStock", "podProvider", variants, "basePrice", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, true, 'prodigi', $9, $10, NOW(), NOW())
       RETURNING *`,
      [artworkId || null, store.id, name, description || '', price * 1.2, price, imageUrl ? [imageUrl] : [], category, JSON.stringify(variants || []), basePrice || price]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product: { ...result.rows[0], store } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product (protected, owner only)
 * PUT /api/products/:id
 */
async function updateProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const productResult = await query(
      `SELECT p.*, s."userId" as "storeUserId" FROM "Product" p JOIN "Store" s ON p."storeId" = s.id WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    if (productResult.rows[0].storeUserId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to update this product', 403);
    }

    const { name, description, category, price, mrp, inStock, variants, images } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex}`); params.push(name); paramIndex++; }
    if (description !== undefined) { updates.push(`description = $${paramIndex}`); params.push(description); paramIndex++; }
    if (category !== undefined) { updates.push(`category = $${paramIndex}`); params.push(category); paramIndex++; }
    if (price !== undefined) { updates.push(`price = $${paramIndex}`); params.push(price); paramIndex++; }
    if (mrp !== undefined) { updates.push(`mrp = $${paramIndex}`); params.push(mrp); paramIndex++; }
    if (inStock !== undefined) { updates.push(`"inStock" = $${paramIndex}`); params.push(inStock); paramIndex++; }
    if (variants !== undefined) { updates.push(`variants = $${paramIndex}`); params.push(JSON.stringify(variants)); paramIndex++; }
    if (images !== undefined) { updates.push(`images = $${paramIndex}`); params.push(images); paramIndex++; }

    updates.push(`"updatedAt" = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE "Product" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product (protected, owner only)
 * DELETE /api/products/:id
 */
async function deleteProduct(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const productResult = await query(
      `SELECT p.*, s."userId" as "storeUserId" FROM "Product" p JOIN "Store" s ON p."storeId" = s.id WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    if (productResult.rows[0].storeUserId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to delete this product', 403);
    }

    // Check if product has orders
    let orderCount = 0;
    try {
      const countResult = await query('SELECT COUNT(*) FROM "OrderItem" WHERE "productId" = $1', [id]);
      orderCount = parseInt(countResult.rows[0].count);
    } catch (e) { /* OrderItem table might not exist */ }

    if (orderCount > 0) {
      await query('UPDATE "Product" SET "inStock" = false WHERE id = $1', [id]);
      return res.status(200).json({
        success: true,
        message: 'Product archived (has existing orders)',
      });
    }

    await query('DELETE FROM "Product" WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sync product with Prodigi (get pricing for variants)
 * POST /api/products/:id/sync-prodigi
 */
async function syncWithProdigi(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { artworkImageUrl } = req.body;

    const productResult = await query(
      `SELECT p.*, s."userId" as "storeUserId" FROM "Product" p JOIN "Store" s ON p."storeId" = s.id WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    if (productResult.rows[0].storeUserId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to sync this product', 403);
    }

    const product = productResult.rows[0];
    const imageUrl = artworkImageUrl || (product.images && product.images[0]);

    if (!imageUrl) {
      throw new AppError('No image URL available for product', 400);
    }

    const availableSKUs = prodigiService.getAvailableSKUs();
    const allSKUs = [...availableSKUs.canvas, ...availableSKUs.poster, ...availableSKUs.fineArt];

    const variantsWithPrices = await Promise.all(
      allSKUs.map(async (skuInfo) => {
        try {
          const quote = await prodigiService.calculatePrice(skuInfo.sku, imageUrl, 'Standard');
          const item = quote.items?.[0];
          const price = item?.recipientCost?.amount ? parseFloat(item.recipientCost.amount) : null;
          return { type: skuInfo.name.includes('Canvas') ? 'canvas' : skuInfo.name.includes('Fine Art') ? 'fineArt' : 'poster', size: skuInfo.size, sku: skuInfo.sku, name: skuInfo.name, price, basePrice: price };
        } catch (error) {
          return { type: skuInfo.name.includes('Canvas') ? 'canvas' : 'poster', size: skuInfo.size, sku: skuInfo.sku, name: skuInfo.name, price: null, error: error.message };
        }
      })
    );

    const result = await query(
      'UPDATE "Product" SET variants = $1 WHERE id = $2 RETURNING *',
      [JSON.stringify(variantsWithPrices.filter(v => v.price !== null)), id]
    );

    res.status(200).json({
      success: true,
      message: 'Product synced with Prodigi',
      data: { product: result.rows[0], variants: variantsWithPrices },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get Prodigi product details
 * GET /api/products/prodigi/skus
 */
async function getProdigiSKUs(req, res, next) {
  try {
    const skus = prodigiService.getAvailableSKUs();
    res.status(200).json({ success: true, data: { skus } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  syncWithProdigi,
  getProdigiSKUs,
};
