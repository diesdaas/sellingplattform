import { sendSuccess } from '@gocart/shared';
import { NotFoundError } from '@gocart/shared';
import { logger } from '@gocart/shared';
import cloudinaryService from '../services/cloudinaryService.js';
import imageService from '../services/imageService.js';
import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';

// Upload single image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      throw new NotFoundError('No image file provided');
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const { folder = 'gocart', public_id, transformation } = req.body;

    logger.info('Uploading image to Cloudinary', {
      filename: originalname,
      size,
      mimetype,
      userId: req.user?.id
    });

    // Upload to Cloudinary
    const uploadResult = await cloudinaryService.uploadImage(buffer, {
      folder,
      public_id,
      resource_type: 'image',
      transformation: transformation ? JSON.parse(transformation) : undefined
    });

    // Store image metadata in database (optional)
    const imageData = {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
      originalFilename: originalname,
      uploadedBy: req.user?.id
    };

    // Publish upload event
    await eventPublisher.publish(EventTypes.IMAGE_UPLOADED, {
      imageId: uploadResult.public_id,
      url: uploadResult.secure_url,
      uploadedBy: req.user?.id,
      size: uploadResult.bytes,
      format: uploadResult.format
    });

    sendSuccess(res, {
      image: {
        id: uploadResult.public_id,
        url: uploadResult.secure_url,
        thumbnail: cloudinaryService.getThumbnailUrl(uploadResult.public_id),
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    logger.error('Image upload failed', { error: error.message });
    throw error;
  }
};

// Upload multiple images
export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new NotFoundError('No image files provided');
    }

    const { folder = 'gocart', transformation } = req.body;
    const uploadedImages = [];

    logger.info('Batch uploading images', {
      count: req.files.length,
      userId: req.user?.id
    });

    // Upload each image
    for (const file of req.files) {
      try {
        const uploadResult = await cloudinaryService.uploadImage(file.buffer, {
          folder,
          resource_type: 'image',
          transformation: transformation ? JSON.parse(transformation) : undefined
        });

        uploadedImages.push({
          id: uploadResult.public_id,
          url: uploadResult.secure_url,
          thumbnail: cloudinaryService.getThumbnailUrl(uploadResult.public_id),
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          size: uploadResult.bytes,
          originalFilename: file.originalname
        });

        // Publish upload event for each image
        await eventPublisher.publish(EventTypes.IMAGE_UPLOADED, {
          imageId: uploadResult.public_id,
          url: uploadResult.secure_url,
          uploadedBy: req.user?.id,
          size: uploadResult.bytes,
          format: uploadResult.format
        });

      } catch (fileError) {
        logger.error('Failed to upload image in batch', {
          filename: file.originalname,
          error: fileError.message
        });
        // Continue with other files
      }
    }

    sendSuccess(res, {
      images: uploadedImages,
      count: uploadedImages.length
    });

  } catch (error) {
    logger.error('Batch image upload failed', { error: error.message });
    throw error;
  }
};

// Get image by public ID
export const getImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { width, height, quality = 'auto', format } = req.query;

    // Generate optimized URL
    const imageUrl = cloudinaryService.getOptimizedUrl(imageId, {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality,
      format
    });

    sendSuccess(res, {
      id: imageId,
      url: imageUrl,
      thumbnail: cloudinaryService.getThumbnailUrl(imageId)
    });

  } catch (error) {
    logger.error('Get image failed', { error: error.message, imageId: req.params.imageId });
    throw error;
  }
};

// Delete image
export const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    logger.info('Deleting image', { imageId, userId: req.user?.id });

    // Delete from Cloudinary
    const deleteResult = await cloudinaryService.deleteImage(imageId);

    // Publish delete event
    await eventPublisher.publish(EventTypes.IMAGE_DELETED, {
      imageId,
      deletedBy: req.user?.id,
      timestamp: new Date().toISOString()
    });

    sendSuccess(res, {
      deleted: true,
      imageId,
      result: deleteResult
    });

  } catch (error) {
    logger.error('Delete image failed', { error: error.message, imageId: req.params.imageId });
    throw error;
  }
};

// Optimize image
export const optimizeImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { quality = 'auto', format } = req.body;

    logger.info('Optimizing image', { imageId, quality, format });

    const optimizedUrl = cloudinaryService.getOptimizedUrl(imageId, {
      quality,
      format,
      fetch_format: 'auto'
    });

    sendSuccess(res, {
      id: imageId,
      optimizedUrl,
      originalUrl: cloudinaryService.getImageUrl(imageId)
    });

  } catch (error) {
    logger.error('Optimize image failed', { error: error.message, imageId: req.params.imageId });
    throw error;
  }
};

// Generate image variants
export const generateVariants = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { variants } = req.body;

    if (!variants || !Array.isArray(variants)) {
      throw new NotFoundError('Variants array is required');
    }

    const generatedVariants = [];

    for (const variant of variants) {
      const variantUrl = cloudinaryService.getOptimizedUrl(imageId, variant);
      generatedVariants.push({
        ...variant,
        url: variantUrl
      });
    }

    sendSuccess(res, {
      imageId,
      variants: generatedVariants
    });

  } catch (error) {
    logger.error('Generate variants failed', { error: error.message, imageId: req.params.imageId });
    throw error;
  }
};
