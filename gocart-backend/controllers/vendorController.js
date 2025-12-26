const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { validatePagination } = require('../middleware/validation');

/**
 * Get vendor profile by ID (public)
 * GET /api/vendors/:id
 */
async function getVendorProfile(req, res, next) {
  try {
    const { id } = req.params;

    const vendorResult = await query(
      'SELECT id, name, image, "isArtist" FROM "User" WHERE id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0 || !vendorResult.rows[0].isArtist) {
      throw new AppError('Vendor not found', 404);
    }

    const vendor = vendorResult.rows[0];

    // Get store
    let store = null;
    try {
      const storeResult = await query('SELECT * FROM "Store" WHERE "userId" = $1', [id]);
      store = storeResult.rows[0] || null;
    } catch (e) { /* Store table might not exist */ }

    // Get portfolio
    let portfolio = null;
    try {
      const portfolioResult = await query('SELECT id, title, bio, "coverImage" FROM "Portfolio" WHERE "artistId" = $1', [id]);
      portfolio = portfolioResult.rows[0] || null;
    } catch (e) { /* Portfolio table might not exist */ }

    // Get product count
    let productCount = 0;
    try {
      const countResult = await query('SELECT COUNT(*) FROM "Product" WHERE "storeId" = $1', [store?.id]);
      productCount = parseInt(countResult.rows[0].count);
    } catch (e) { /* Product table might not exist */ }

    res.status(200).json({
      success: true,
      data: { vendor: { ...vendor, store, portfolio, productCount } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get vendor profile by username (public)
 * GET /api/vendors/username/:username
 */
async function getVendorProfileByUsername(req, res, next) {
  try {
    const { username } = req.params;

    const storeResult = await query(
      `SELECT s.*, u.id as "userId", u.name, u.image, u."isArtist"
       FROM "Store" s JOIN "User" u ON s."userId" = u.id
       WHERE s.username = $1`,
      [username]
    );

    if (storeResult.rows.length === 0 || !storeResult.rows[0].isArtist) {
      throw new AppError('Vendor not found', 404);
    }

    const store = storeResult.rows[0];

    let productCount = 0;
    try {
      const countResult = await query('SELECT COUNT(*) FROM "Product" WHERE "storeId" = $1', [store.id]);
      productCount = parseInt(countResult.rows[0].count);
    } catch (e) { /* Product table might not exist */ }

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: store.userId, name: store.name, image: store.image, isArtist: store.isArtist,
          store: { ...store, productCount },
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current vendor's profile (protected)
 * GET /api/vendors/me
 */
async function getMyVendorProfile(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User is not a vendor', 403);
    }

    const vendorResult = await query('SELECT * FROM "User" WHERE id = $1', [userId]);
    const vendor = vendorResult.rows[0];

    let store = null;
    try {
      const storeResult = await query('SELECT * FROM "Store" WHERE "userId" = $1', [userId]);
      store = storeResult.rows[0] || null;
    } catch (e) { /* Store table might not exist */ }

    let portfolio = null;
    try {
      const portfolioResult = await query('SELECT * FROM "Portfolio" WHERE "artistId" = $1', [userId]);
      portfolio = portfolioResult.rows[0] || null;
    } catch (e) { /* Portfolio table might not exist */ }

    res.status(200).json({
      success: true,
      data: { vendor: { ...vendor, store, portfolio } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register as vendor (protected)
 * POST /api/vendors/register
 */
async function registerVendor(req, res, next) {
  try {
    const userId = req.user.id;

    if (req.user.isArtist) {
      throw new AppError('User is already a vendor', 400);
    }

    const { storeName, storeDescription, username, address, contact, logo } = req.body;

    if (!storeName || !username) {
      throw new AppError('Store name and username are required', 400);
    }

    const existingResult = await query('SELECT id FROM "Store" WHERE username = $1', [username]);

    if (existingResult.rows.length > 0) {
      throw new AppError('Username is already taken', 409);
    }

    const storeResult = await query(
      `INSERT INTO "Store" (id, "userId", name, description, username, address, contact, logo, email, status, "isActive", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, 'pending', false, NOW(), NOW())
       RETURNING *`,
      [userId, storeName, storeDescription || '', username, address || '', contact || '', logo || req.user.image || '', req.user.email]
    );

    await query('UPDATE "User" SET "isArtist" = true, role = $1, "updatedAt" = NOW() WHERE id = $2', ['artist', userId]);

    const userResult = await query('SELECT id, email, name, role, "isArtist" FROM "User" WHERE id = $1', [userId]);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully',
      data: { vendor: { ...userResult.rows[0], store: storeResult.rows[0] } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update vendor profile (protected, owner only)
 * PUT /api/vendors/me
 */
async function updateVendorProfile(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User is not a vendor', 403);
    }

    const { storeName, storeDescription, logo, coverImage, address, contact } = req.body;

    const storeResult = await query('SELECT id FROM "Store" WHERE "userId" = $1', [userId]);

    if (storeResult.rows.length === 0) {
      throw new AppError('Store not found', 404);
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (storeName !== undefined) { updates.push(`name = $${paramIndex}`); params.push(storeName); paramIndex++; }
    if (storeDescription !== undefined) { updates.push(`description = $${paramIndex}`); params.push(storeDescription); paramIndex++; }
    if (logo !== undefined) { updates.push(`logo = $${paramIndex}`); params.push(logo); paramIndex++; }
    if (address !== undefined) { updates.push(`address = $${paramIndex}`); params.push(address); paramIndex++; }
    if (contact !== undefined) { updates.push(`contact = $${paramIndex}`); params.push(contact); paramIndex++; }

    updates.push(`"updatedAt" = NOW()`);
    params.push(storeResult.rows[0].id);

    const updatedResult = await query(
      `UPDATE "Store" SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (coverImage !== undefined) {
      try {
        await query('UPDATE "Portfolio" SET "coverImage" = $1, "updatedAt" = NOW() WHERE "artistId" = $2', [coverImage, userId]);
      } catch (e) { /* Portfolio might not exist */ }
    }

    res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: { store: updatedResult.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get vendor dashboard analytics (protected, vendor only)
 * GET /api/vendors/me/dashboard
 */
async function getVendorDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    if (!req.user.isArtist) {
      throw new AppError('User is not a vendor', 403);
    }

    const storeResult = await query('SELECT id FROM "Store" WHERE "userId" = $1', [userId]);

    if (storeResult.rows.length === 0) {
      throw new AppError('Store not found', 404);
    }

    const storeId = storeResult.rows[0].id;

    // Stats with fallbacks for missing tables
    let totalSales = 0, totalOrders = 0, thisMonthRevenue = 0, totalProducts = 0, pendingOrders = 0;
    const topProducts = [], recentOrders = [];

    try {
      const salesResult = await query('SELECT COALESCE(SUM(total), 0) as total FROM "Order" WHERE "storeId" = $1 AND "isPaid" = true', [storeId]);
      totalSales = parseFloat(salesResult.rows[0].total) || 0;

      const ordersResult = await query('SELECT COUNT(*) FROM "Order" WHERE "storeId" = $1', [storeId]);
      totalOrders = parseInt(ordersResult.rows[0].count);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthResult = await query('SELECT COALESCE(SUM(total), 0) as total FROM "Order" WHERE "storeId" = $1 AND "isPaid" = true AND "createdAt" >= $2', [storeId, startOfMonth]);
      thisMonthRevenue = parseFloat(monthResult.rows[0].total) || 0;

      const pendingResult = await query('SELECT COUNT(*) FROM "Order" WHERE "storeId" = $1 AND status IN ($2, $3)', [storeId, 'ORDER_PLACED', 'PROCESSING']);
      pendingOrders = parseInt(pendingResult.rows[0].count);
    } catch (e) { /* Order table might not exist */ }

    try {
      const productsResult = await query('SELECT COUNT(*) FROM "Product" WHERE "storeId" = $1', [storeId]);
      totalProducts = parseInt(productsResult.rows[0].count);
    } catch (e) { /* Product table might not exist */ }

    res.status(200).json({
      success: true,
      data: {
        dashboard: { totalSales, totalOrders, totalProducts, thisMonthRevenue, pendingOrders, topProducts, recentOrders },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get vendor's orders (protected, vendor only)
 * GET /api/vendors/me/orders
 */
async function getVendorOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!req.user.isArtist) {
      throw new AppError('User is not a vendor', 403);
    }

    const storeResult = await query('SELECT id FROM "Store" WHERE "userId" = $1', [userId]);

    if (storeResult.rows.length === 0) {
      throw new AppError('Store not found', 404);
    }

    const storeId = storeResult.rows[0].id;
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '"storeId" = $1';
    const params = [storeId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const ordersResult = await query(
      `SELECT * FROM "Order" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM "Order" WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        orders: ordersResult.rows,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get vendor's products (protected, vendor only)
 * GET /api/vendors/me/products
 */
async function getVendorProducts(req, res, next) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, inStock } = req.query;

    if (!req.user.isArtist) {
      throw new AppError('User is not a vendor', 403);
    }

    const storeResult = await query('SELECT id FROM "Store" WHERE "userId" = $1', [userId]);

    if (storeResult.rows.length === 0) {
      throw new AppError('Store not found', 404);
    }

    const storeId = storeResult.rows[0].id;
    const { page: pageNum, limit: limitNum } = validatePagination(page, limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '"storeId" = $1';
    const params = [storeId];
    let paramIndex = 2;

    if (inStock !== undefined) {
      whereClause += ` AND "inStock" = $${paramIndex}`;
      params.push(inStock === 'true');
      paramIndex++;
    }

    const productsResult = await query(
      `SELECT * FROM "Product" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM "Product" WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVendorProfile,
  getVendorProfileByUsername,
  getMyVendorProfile,
  registerVendor,
  updateVendorProfile,
  getVendorDashboard,
  getVendorOrders,
  getVendorProducts,
};
