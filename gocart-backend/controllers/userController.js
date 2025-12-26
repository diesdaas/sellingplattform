const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/passwordHash');
const { validateEmail, validatePassword } = require('../middleware/validation');
const AppError = require('../utils/AppError');

/**
 * Get user profile
 * GET /api/users/me
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const userResult = await query(
      `SELECT id, email, name, image, role, "isArtist", "createdAt", "updatedAt"
       FROM "User" WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Get portfolio if exists
    let portfolio = null;
    try {
      const portfolioResult = await query(
        'SELECT id, title, bio, "coverImage" FROM "Portfolio" WHERE "artistId" = $1',
        [userId]
      );
      portfolio = portfolioResult.rows[0] || null;
    } catch (e) {
      // Portfolio table might not exist
    }

    // Get store if exists
    let store = null;
    try {
      const storeResult = await query(
        'SELECT id, name, username, status, "isActive" FROM "Store" WHERE "userId" = $1',
        [userId]
      );
      store = storeResult.rows[0] || null;
    } catch (e) {
      // Store table might not exist
    }

    res.status(200).json({
      success: true,
      data: { user: { ...user, portfolio, store } },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * PUT /api/users/me
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, image, email } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (image !== undefined) {
      updates.push(`image = $${paramIndex}`);
      params.push(image);
      paramIndex++;
    }

    if (email !== undefined) {
      if (!validateEmail(email)) {
        throw new AppError('Invalid email format', 400);
      }

      const existingResult = await query(
        'SELECT id FROM "User" WHERE email = $1 AND id != $2',
        [email.toLowerCase(), userId]
      );

      if (existingResult.rows.length > 0) {
        throw new AppError('Email already in use', 409);
      }

      updates.push(`email = $${paramIndex}`);
      params.push(email.toLowerCase());
      paramIndex++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updates.push(`"updatedAt" = NOW()`);
    params.push(userId);

    const result = await query(
      `UPDATE "User" SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, email, name, image, role, "isArtist", "updatedAt"`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 * PUT /api/users/me/password
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(passwordValidation.message, 400);
    }

    const userResult = await query('SELECT password FROM "User" WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const isPasswordValid = await comparePassword(currentPassword, userResult.rows[0].password);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const hashedPassword = await hashPassword(newPassword);

    await query(
      'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register as artist
 * POST /api/users/become-artist
 */
async function becomeArtist(req, res, next) {
  try {
    const userId = req.user.id;

    if (req.user.isArtist) {
      throw new AppError('User is already registered as an artist', 400);
    }

    const result = await query(
      `UPDATE "User" SET "isArtist" = true, role = 'artist', "updatedAt" = NOW()
       WHERE id = $1
       RETURNING id, email, name, role, "isArtist"`,
      [userId]
    );

    res.status(200).json({
      success: true,
      message: 'Successfully registered as artist',
      data: { user: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID (public profile)
 * GET /api/users/:id
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const userResult = await query(
      'SELECT id, name, image, "isArtist", "createdAt" FROM "User" WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Get portfolio if exists
    let portfolio = null;
    try {
      const portfolioResult = await query(
        'SELECT id, title, bio, "coverImage" FROM "Portfolio" WHERE "artistId" = $1',
        [id]
      );
      portfolio = portfolioResult.rows[0] || null;
    } catch (e) {
      // Portfolio table might not exist
    }

    // Get store if exists
    let store = null;
    try {
      const storeResult = await query(
        'SELECT id, name, username, logo, "isActive" FROM "Store" WHERE "userId" = $1',
        [id]
      );
      store = storeResult.rows[0] || null;
    } catch (e) {
      // Store table might not exist
    }

    res.status(200).json({
      success: true,
      data: { user: { ...user, portfolio, store } },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  becomeArtist,
  getUserById,
};
