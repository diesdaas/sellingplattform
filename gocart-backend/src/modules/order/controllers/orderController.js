const { query } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Create order from cart (protected)
 * POST /api/orders
 */
async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { addressId, paymentMethod = 'STRIPE' } = req.body;

    if (!addressId) {
      throw new AppError('Shipping address is required', 400);
    }

    // Get user's cart
    const cartResult = await query(
      `SELECT c.*, ci.id as "itemId", ci."productId", ci.variant, ci.quantity, ci.price,
              p.name as "productName", p."storeId", p."inStock"
       FROM "Cart" c
       LEFT JOIN "CartItem" ci ON c.id = ci."cartId"
       LEFT JOIN "Product" p ON ci."productId" = p.id
       WHERE c."userId" = $1`,
      [userId]
    );

    if (cartResult.rows.length === 0 || !cartResult.rows[0].itemId) {
      throw new AppError('Cart is empty', 400);
    }

    // Get shipping address
    const addressResult = await query('SELECT * FROM "Address" WHERE id = $1 AND "userId" = $2', [addressId, userId]);

    if (addressResult.rows.length === 0) {
      throw new AppError('Shipping address not found', 404);
    }

    const address = addressResult.rows[0];

    // Validate stock and group by store
    const itemsByStore = {};
    for (const row of cartResult.rows) {
      if (!row.itemId) continue;
      
      if (!row.inStock) {
        throw new AppError(`Product ${row.productName} is out of stock`, 400);
      }

      if (!itemsByStore[row.storeId]) {
        itemsByStore[row.storeId] = [];
      }
      itemsByStore[row.storeId].push({
        productId: row.productId,
        variant: row.variant,
        quantity: row.quantity,
        price: row.price
      });
    }

    const cartId = cartResult.rows[0].id;
    const createdOrders = [];

    // Create orders for each store
    for (const [storeId, items] of Object.entries(itemsByStore)) {
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderResult = await query(
        `INSERT INTO "Order" (id, "userId", "storeId", total, status, "addressId", "isPaid", "paymentMethod", "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, 'ORDER_PLACED', $4, false, $5, NOW(), NOW())
         RETURNING *`,
        [userId, storeId, total, addressId, paymentMethod]
      );

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        await query(
          `INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, price, variant)
           VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.quantity, item.price, JSON.stringify(item.variant || {})]
        );
      }

      createdOrders.push(order);
    }

    // Clear cart
    await query('DELETE FROM "CartItem" WHERE "cartId" = $1', [cartId]);
    await query('UPDATE "Cart" SET "totalPrice" = 0 WHERE id = $1', [cartId]);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { orders: createdOrders },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's orders (protected)
 * GET /api/orders
 */
async function getOrders(req, res, next) {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '"userId" = $1';
    const params = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const ordersResult = await query(
      `SELECT o.*, s.name as "storeName", s.username as "storeUsername"
       FROM "Order" o
       LEFT JOIN "Store" s ON o."storeId" = s.id
       WHERE ${whereClause}
       ORDER BY o."createdAt" DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM "Order" WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Get order items for each order
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await query(
        `SELECT oi.*, p.name as "productName", p.images as "productImages"
         FROM "OrderItem" oi
         JOIN "Product" p ON oi."productId" = p.id
         WHERE oi."orderId" = $1`,
        [order.id]
      );

      orders.push({
        ...order,
        store: { id: order.storeId, name: order.storeName, username: order.storeUsername },
        orderItems: itemsResult.rows.map(item => ({
          ...item,
          product: { id: item.productId, name: item.productName, images: item.productImages }
        }))
      });
    }

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get order by ID (protected)
 * GET /api/orders/:id
 */
async function getOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const orderResult = await query(
      `SELECT o.*, s.name as "storeName", s.username as "storeUsername", s."userId" as "storeUserId"
       FROM "Order" o
       LEFT JOIN "Store" s ON o."storeId" = s.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];

    if (order.userId !== userId && order.storeUserId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to view this order', 403);
    }

    const itemsResult = await query(
      `SELECT oi.*, p.name as "productName", p.images as "productImages"
       FROM "OrderItem" oi
       JOIN "Product" p ON oi."productId" = p.id
       WHERE oi."orderId" = $1`,
      [id]
    );

    order.store = { id: order.storeId, name: order.storeName, username: order.storeUsername };
    order.orderItems = itemsResult.rows.map(item => ({
      ...item,
      product: { id: item.productId, name: item.productName, images: item.productImages }
    }));

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status (protected, vendor/admin only)
 * PUT /api/orders/:id/status
 */
async function updateOrderStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError('Status is required', 400);
    }

    const validStatuses = ['ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const orderResult = await query(
      `SELECT o.*, s."userId" as "storeUserId" FROM "Order" o JOIN "Store" s ON o."storeId" = s.id WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    if (orderResult.rows[0].storeUserId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to update this order', 403);
    }

    const result = await query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *', [status, id]);

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: { order: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order (protected, owner only)
 * POST /api/orders/:id/cancel
 */
async function cancelOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const orderResult = await query('SELECT * FROM "Order" WHERE id = $1', [id]);

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];

    if (order.userId !== userId && req.user.role !== 'admin') {
      throw new AppError('You do not have permission to cancel this order', 403);
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new AppError('Order cannot be cancelled', 400);
    }

    const result = await query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *', ['CANCELLED', id]);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
};
