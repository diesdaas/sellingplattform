// Artwork Controller - Full implementation for modular backend
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError, asyncHandler } from '@gocart/shared';

const prisma = new PrismaClient();

/**
 * List artworks with filtering and pagination
 * GET /api/catalog/artworks
 */
export const listArtworks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    artistId,
    isPublic,
    search,
    medium,
    style,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const offset = (pageNum - 1) * limitNum;

  // Build where clause
  const where = {
    ...(artistId && {
      portfolio: {
        artistId
      }
    }),
    ...(isPublic !== undefined && { isPublic: isPublic === 'true' }),
    ...(medium && { medium }),
    ...(style && { style })
  };

  // Add search functionality
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search] } }
    ];
  }

  // Add privacy filter for non-owners
  if (req.user?.id && artistId !== req.user.id) {
    where.isPublic = true;
  } else if (!req.user?.id) {
    where.isPublic = true;
  }

  // Build order clause
  const orderBy = {};
  if (sortBy === 'title') {
    orderBy.title = order.toLowerCase();
  } else if (sortBy === 'year') {
    orderBy.year = order.toLowerCase();
  } else {
    orderBy.createdAt = order.toLowerCase();
  }

  const [artworks, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      include: {
        portfolio: {
          select: {
            artistId: true,
            artist: {
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
    prisma.artwork.count({ where })
  ]);

  sendSuccess(res, {
    artworks: artworks.map(artwork => ({
      ...artwork,
      artist: artwork.portfolio.artist
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  }, 'Artworks retrieved successfully');
});

/**
 * Get artwork by ID
 * GET /api/catalog/artworks/:id
 */
export const getArtwork = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      portfolio: {
        select: {
          artistId: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      }
    }
  });

  if (!artwork) {
    return sendError(res, 'Artwork not found', 404);
  }

  // Check privacy
  if (!artwork.isPublic && req.user?.id !== artwork.portfolio.artistId) {
    return sendError(res, 'Artwork not found', 404);
  }

  // Get related products
  let products = [];
  try {
    products = await prisma.product.findMany({
      where: {
        artworkId: id,
        inStock: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        variants: true
      }
    });
  } catch (error) {
    // Products table might not exist yet
  }

  sendSuccess(res, {
    artwork: {
      ...artwork,
      artist: artwork.portfolio.artist,
      products
    }
  }, 'Artwork retrieved successfully');
});

/**
 * Create artwork (protected, artist only)
 * POST /api/catalog/artworks
 */
export const createArtwork = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!req.user.isArtist) {
    return sendError(res, 'User must be an artist to add artworks', 403);
  }

  const { title, description, imageUrl, medium, style, year, tags, isPublic } = req.body;

  if (!title || !imageUrl) {
    return sendError(res, 'Title and imageUrl are required', 400);
  }

  // Get or create portfolio
  let portfolio = await prisma.portfolio.findFirst({
    where: { artistId: userId }
  });

  if (!portfolio) {
    portfolio = await prisma.portfolio.create({
      data: {
        id: `portfolio-${userId}`,
        artistId: userId,
        bio: '',
        website: '',
        socialLinks: {},
        isPublic: true
      }
    });
  }

  const artwork = await prisma.artwork.create({
    data: {
      portfolioId: portfolio.id,
      title,
      description: description || null,
      imageUrl,
      medium: medium || null,
      style: style || null,
      year: year ? parseInt(year) : null,
      tags: tags || [],
      isPublic: isPublic !== false
    },
    include: {
      portfolio: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      }
    }
  });

  sendSuccess(res, {
    artwork: {
      ...artwork,
      artist: artwork.portfolio.artist
    }
  }, 'Artwork created successfully', 201);
});

/**
 * Update artwork (protected, owner only)
 * PUT /api/catalog/artworks/:id
 */
export const updateArtwork = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
    const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

    if (!req.user.isArtist) {
    return sendError(res, 'User must be an artist to update artworks', 403);
  }

  const artwork = await prisma.artwork.findFirst({
    where: { id },
    include: {
      portfolio: true
    }
  });

  if (!artwork) {
    return sendError(res, 'Artwork not found', 404);
  }

  if (artwork.portfolio.artistId !== userId) {
    return sendError(res, 'You do not have permission to update this artwork', 403);
    }

    const { title, description, imageUrl, medium, style, year, tags, isPublic } = req.body;

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (medium !== undefined) updateData.medium = medium;
  if (style !== undefined) updateData.style = style;
  if (year !== undefined) updateData.year = parseInt(year);
  if (tags !== undefined) updateData.tags = tags;
  if (isPublic !== undefined) updateData.isPublic = isPublic;

  updateData.updatedAt = new Date();

  const updatedArtwork = await prisma.artwork.update({
    where: { id },
    data: updateData,
    include: {
      portfolio: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      }
    }
  });

  sendSuccess(res, {
    artwork: {
      ...updatedArtwork,
      artist: updatedArtwork.portfolio.artist
    }
  }, 'Artwork updated successfully');
});

/**
 * Delete artwork (protected, owner only)
 * DELETE /api/catalog/artworks/:id
 */
export const deleteArtwork = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
    const { id } = req.params;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!req.user.isArtist) {
    return sendError(res, 'User must be an artist to delete artworks', 403);
  }

  const artwork = await prisma.artwork.findFirst({
    where: { id },
    include: {
      portfolio: true
    }
  });

  if (!artwork) {
    return sendError(res, 'Artwork not found', 404);
  }

  if (artwork.portfolio.artistId !== userId) {
    return sendError(res, 'You do not have permission to delete this artwork', 403);
  }

  // Check if artwork has products
  let productCount = 0;
  try {
    productCount = await prisma.product.count({
      where: { artworkId: id }
    });
  } catch (error) {
    // Products table might not exist
  }

  if (productCount > 0) {
    return sendError(res, 'Cannot delete artwork that has associated products. Remove products first.', 400);
  }

  await prisma.artwork.delete({
    where: { id }
  });

  sendSuccess(res, { deleted: true }, 'Artwork deleted successfully');
});
