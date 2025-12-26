// Product Controller - Full implementation for modular backend
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError, asyncHandler, schemas } from '@gocart/shared';

const prisma = new PrismaClient();

// Validation middleware
const validateProductCreate = (req, res, next) => {
  const { error } = schemas.product.create.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return sendError(res, `Validation failed: ${errors.map(e => e.message).join(', ')}`, 400);
  }
  next();
};

const validateProductUpdate = (req, res, next) => {
  const { error } = schemas.product.update.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return sendError(res, `Validation failed: ${errors.map(e => e.message).join(', ')}`, 400);
  }
  next();
};

/**
 * List products with filtering and pagination
 * GET /api/catalog/products
 */
export const listProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    search,
    artistId,
    inStock,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const offset = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {
    ...(category && { category }),
    ...(minPrice !== undefined && { price: { gte: parseFloat(minPrice) } }),
    ...(maxPrice !== undefined && { price: { lte: parseFloat(maxPrice) } }),
    ...(inStock !== undefined && { inStock: inStock === 'true' }),
    ...(artistId && {
      store: {
        userId: artistId
      }
    })
  };

  // Add search functionality
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Build order clause
  const orderBy = {};
  if (sortBy === 'price') {
    orderBy.price = order.toLowerCase();
  } else {
    orderBy.createdAt = order.toLowerCase();
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            username: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy,
      skip: offset,
      take: limitNum
    }),
    prisma.product.count({ where })
  ]);

  sendSuccess(res, {
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, 'Products retrieved successfully');
});

/**
 * Get product by ID
 * GET /api/catalog/products/:id
 */
export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          username: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      },
      artwork: {
        select: {
          id: true,
          title: true,
          imageUrl: true
        }
      }
    }
  });

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  // Get ratings if they exist
  let ratings = [];
  try {
    ratings = await prisma.rating.findMany({
      where: { productId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  } catch (error) {
    // Ratings table might not exist yet
    console.log('Ratings not available:', error.message);
  }

  sendSuccess(res, {
    product: {
      ...product,
      ratings
    }
  }, 'Product retrieved successfully');
});

/**
 * Create product from artwork (protected, artist only)
 * POST /api/catalog/products
 */
export const createProduct = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!req.user.isArtist) {
    return sendError(res, 'User must be an artist to create products', 403);
  }

  const { artworkId, name, description, category, price, variants } = req.body;

  if (!name || !category || !price) {
    return sendError(res, 'Name, category, and price are required', 400);
  }

  // Get or create store
  let store = await prisma.store.findFirst({
    where: { userId }
  });

  if (!store) {
    store = await prisma.store.create({
      data: {
        id: `store-${userId}`,
        userId,
        name: `${req.user.name}'s Store`,
        username: `store-${userId.slice(-8)}`,
        email: req.user.email,
        description: 'My store',
        address: '',
        contact: '',
        logo: null
      }
    });
  }

  // Validate artwork if provided
  let imageUrl = null;
  if (artworkId) {
    const artwork = await prisma.artwork.findFirst({
      where: {
        id: artworkId,
        portfolio: {
          artistId: userId
        }
      }
    });

    if (!artwork) {
      return sendError(res, 'Artwork not found or access denied', 404);
    }

    imageUrl = artwork.imageUrl;
  }

  const product = await prisma.product.create({
    data: {
      artworkId,
      storeId: store.id,
      name,
      description: description || '',
      price: parseFloat(price),
      mrp: parseFloat(price) * 1.2,
      images: imageUrl ? [imageUrl] : [],
      category,
      inStock: true,
      podProvider: 'prodigi',
      variants: variants ? JSON.stringify(variants) : JSON.stringify([]),
      basePrice: parseFloat(price)
    },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  });

  sendSuccess(res, { product }, 'Product created successfully', 201);
});

/**
 * Update product (protected, owner only)
 * PUT /api/catalog/products/:id
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const product = await prisma.product.findFirst({
    where: { id },
    include: { store: true }
  });

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  if (product.store.userId !== userId && req.user.role !== 'admin') {
    return sendError(res, 'You do not have permission to update this product', 403);
  }

  const { name, description, category, price, mrp, inStock, variants, images } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (price !== undefined) updateData.price = parseFloat(price);
  if (mrp !== undefined) updateData.mrp = parseFloat(mrp);
  if (inStock !== undefined) updateData.inStock = inStock;
  if (variants !== undefined) updateData.variants = JSON.stringify(variants);
  if (images !== undefined) updateData.images = images;

  updateData.updatedAt = new Date();

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      store: {
        select: {
          id: true,
          name: true,
          username: true
        }
      }
    }
  });

  sendSuccess(res, { product: updatedProduct }, 'Product updated successfully');
});

/**
 * Delete product (protected, owner only)
 * DELETE /api/catalog/products/:id
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  const product = await prisma.product.findFirst({
    where: { id },
    include: { store: true }
  });

  if (!product) {
    return sendError(res, 'Product not found', 404);
  }

  if (product.store.userId !== userId && req.user.role !== 'admin') {
    return sendError(res, 'You do not have permission to delete this product', 403);
  }

  // Check if product has orders
  let orderCount = 0;
  try {
    orderCount = await prisma.orderItem.count({
      where: { productId: id }
    });
  } catch (error) {
    // OrderItem table might not exist
  }

  if (orderCount > 0) {
    // Archive instead of delete
    await prisma.product.update({
      where: { id },
      data: { inStock: false }
    });
    return sendSuccess(res, { archived: true }, 'Product archived (has existing orders)');
  }

  await prisma.product.delete({
    where: { id }
  });

  sendSuccess(res, { deleted: true }, 'Product deleted successfully');
});
