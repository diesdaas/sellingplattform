const { query, getClient } = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Add item to cart (protected)
 * POST /api/cart/add
 */
async function addToCart(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, variant, quantity = 1 } = req.body;

    if (!productId) {
      throw new AppError('Product ID is required', 400);
    }

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    // Get product
    const productResult = await query('SELECT * FROM "Product" WHERE id = $1', [productId]);

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const product = productResult.rows[0];

    if (!product.inStock) {
      throw new AppError('Product is out of stock', 400);
    }

    // Get or create cart
    let cartResult = await query('SELECT * FROM "Cart" WHERE "userId" = $1', [userId]);
    
    let cart;
    if (cartResult.rows.length === 0) {
      const createResult = await query(
        'INSERT INTO "Cart" (id, "userId", "totalPrice", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, 0, NOW(), NOW()) RETURNING *',
        [userId]
      );
      cart = createResult.rows[0];
    } else {
      cart = cartResult.rows[0];
    }

    // Check if item already exists in cart
    const existingItemResult = await query(
      'SELECT * FROM "CartItem" WHERE "cartId" = $1 AND "productId" = $2 AND variant = $3',
      [cart.id, productId, JSON.stringify(variant || {})]
    );

    if (existingItemResult.rows.length > 0) {
      // Update quantity
      await query(
        'UPDATE "CartItem" SET quantity = quantity + $1, price = $2 WHERE id = $3',
        [quantity, product.price, existingItemResult.rows[0].id]
      );
    } else {
      // Add new item
      await query(
        'INSERT INTO "CartItem" (id, "cartId", "productId", variant, quantity, price) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)',
        [cart.id, productId, JSON.stringify(variant || {}), quantity, product.price]
      );
    }

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id);

    res.status(200).json({
      success: true,
      message: 'Item added to cart',
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's cart (protected)
 * GET /api/cart
 */
async function getCart(req, res, next) {
  try {
    const userId = req.user.id;

    let cartResult = await query('SELECT * FROM "Cart" WHERE "userId" = $1', [userId]);
    
    let cart;
    if (cartResult.rows.length === 0) {
      const createResult = await query(
        'INSERT INTO "Cart" (id, "userId", "totalPrice", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, 0, NOW(), NOW()) RETURNING *',
        [userId]
      );
      cart = createResult.rows[0];
      cart.items = [];
    } else {
      cart = await getCartWithItems(cartResult.rows[0].id);
    }

    res.status(200).json({
      success: true,
      data: { cart },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update cart item quantity (protected)
 * PUT /api/cart/:itemId
 */
async function updateCartItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const itemResult = await query(
      `SELECT ci.*, c."userId", p."inStock" FROM "CartItem" ci
       JOIN "Cart" c ON ci."cartId" = c.id
       JOIN "Product" p ON ci."productId" = p.id
       WHERE ci.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      throw new AppError('Cart item not found', 404);
    }

    if (itemResult.rows[0].userId !== userId) {
      throw new AppError('You do not have permission to update this cart item', 403);
    }

    if (!itemResult.rows[0].inStock) {
      throw new AppError('Product is out of stock', 400);
    }

    await query('UPDATE "CartItem" SET quantity = $1 WHERE id = $2', [quantity, itemId]);

    const updatedCart = await getCartWithItems(itemResult.rows[0].cartId);

    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove item from cart (protected)
 * DELETE /api/cart/:itemId
 */
async function removeCartItem(req, res, next) {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const itemResult = await query(
      `SELECT ci.*, c."userId" FROM "CartItem" ci JOIN "Cart" c ON ci."cartId" = c.id WHERE ci.id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      throw new AppError('Cart item not found', 404);
    }

    if (itemResult.rows[0].userId !== userId) {
      throw new AppError('You do not have permission to remove this cart item', 403);
    }

    await query('DELETE FROM "CartItem" WHERE id = $1', [itemId]);

    const updatedCart = await getCartWithItems(itemResult.rows[0].cartId);

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: { cart: updatedCart },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clear cart (protected)
 * POST /api/cart/clear
 */
async function clearCart(req, res, next) {
  try {
    const userId = req.user.id;

    const cartResult = await query('SELECT id FROM "Cart" WHERE "userId" = $1', [userId]);

    if (cartResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Cart is already empty',
        data: { cart: { items: [], totalPrice: 0 } },
      });
    }

    await query('DELETE FROM "CartItem" WHERE "cartId" = $1', [cartResult.rows[0].id]);
    await query('UPDATE "Cart" SET "totalPrice" = 0 WHERE id = $1', [cartResult.rows[0].id]);

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: { cart: { items: [], totalPrice: 0 } },
    });
  } catch (error) {
    next(error);
  }
}

// Helper function to get cart with items
async function getCartWithItems(cartId) {
  const cartResult = await query('SELECT * FROM "Cart" WHERE id = $1', [cartId]);
  
  if (cartResult.rows.length === 0) {
    return null;
  }

  const cart = cartResult.rows[0];

  const itemsResult = await query(
    `SELECT ci.*, p.name as "productName", p.price as "productPrice", p.images as "productImages", p."inStock"
     FROM "CartItem" ci
     JOIN "Product" p ON ci."productId" = p.id
     WHERE ci."cartId" = $1`,
    [cartId]
  );

  cart.items = itemsResult.rows.map(item => ({
    ...item,
    product: {
      id: item.productId,
      name: item.productName,
      price: item.productPrice,
      images: item.productImages,
      inStock: item.inStock
    }
  }));

  // Recalculate total
  const totalPrice = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  if (cart.totalPrice !== totalPrice) {
    await query('UPDATE "Cart" SET "totalPrice" = $1 WHERE id = $2', [totalPrice, cartId]);
    cart.totalPrice = totalPrice;
  }

  return cart;
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
