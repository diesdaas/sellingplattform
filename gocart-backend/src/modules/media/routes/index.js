import express from 'express';
import multer from 'multer';
import {
  uploadImage,
  uploadImages,
  getImage,
  deleteImage,
  optimizeImage,
  generateVariants
} from '../controllers/uploadController.js';
import { asyncHandler } from '@gocart/shared';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  }
});

const router = express.Router();

// Upload single image
router.post('/upload', upload.single('image'), asyncHandler(uploadImage));

// Upload multiple images
router.post('/upload/batch', upload.array('images', 10), asyncHandler(uploadImages));

// Get image by ID
router.get('/image/:imageId', asyncHandler(getImage));

// Delete image
router.delete('/image/:imageId', asyncHandler(deleteImage));

// Optimize image
router.post('/image/:imageId/optimize', asyncHandler(optimizeImage));

// Generate image variants
router.post('/image/:imageId/variants', asyncHandler(generateVariants));

// Health check for media module
router.get('/health', (req, res) => {
  res.json({
    module: 'media',
    status: 'healthy',
    version: '1.0.0',
    cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME &&
                           process.env.CLOUDINARY_API_KEY &&
                           process.env.CLOUDINARY_API_SECRET)
  });
});

export default router;
