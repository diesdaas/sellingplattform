import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@gocart/shared';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  // Upload image buffer to Cloudinary
  async uploadImage(buffer, options = {}) {
    try {
      const uploadOptions = {
        resource_type: 'image',
        ...options
      };

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload failed', { error: error.message });
              reject(error);
            } else {
              logger.info('Cloudinary upload successful', {
                publicId: result.public_id,
                url: result.secure_url,
                bytes: result.bytes
              });
              resolve(result);
            }
          }
        );

        // Write buffer to stream
        uploadStream.end(buffer);
      });

    } catch (error) {
      logger.error('Cloudinary upload error', { error: error.message });
      throw error;
    }
  }

  // Delete image from Cloudinary
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      logger.info('Cloudinary delete successful', {
        publicId,
        result: result.result
      });

      return result;

    } catch (error) {
      logger.error('Cloudinary delete error', {
        error: error.message,
        publicId
      });
      throw error;
    }
  }

  // Get optimized image URL
  getOptimizedUrl(publicId, options = {}) {
    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      crop = 'fill',
      gravity = 'auto'
    } = options;

    const transformation = [];

    if (width) transformation.push(`w_${width}`);
    if (height) transformation.push(`h_${height}`);
    if (crop) transformation.push(`c_${crop}`);
    if (gravity) transformation.push(`g_${gravity}`);
    if (quality) transformation.push(`q_${quality}`);
    if (format) transformation.push(`f_${format}`);

    const transformationString = transformation.join(',');

    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(publicId, size = 150) {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      quality: 'auto'
    });
  }

  // Get original image URL
  getImageUrl(publicId) {
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
  }

  // Generate responsive image URLs
  getResponsiveUrls(publicId, breakpoints = [320, 640, 1024, 1920]) {
    const urls = {};

    breakpoints.forEach(breakpoint => {
      urls[`${breakpoint}w`] = this.getOptimizedUrl(publicId, {
        width: breakpoint,
        crop: 'fill',
        quality: 'auto'
      });
    });

    return urls;
  }

  // Apply transformation to image
  applyTransformation(publicId, transformation) {
    const transformationString = Array.isArray(transformation)
      ? transformation.join(',')
      : transformation;

    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformationString}/${publicId}`;
  }

  // Batch upload images
  async uploadImages(images, options = {}) {
    const results = [];

    for (const image of images) {
      try {
        const result = await this.uploadImage(image.buffer, {
          ...options,
          public_id: image.publicId
        });
        results.push(result);
      } catch (error) {
        logger.error('Batch upload failed for image', {
          error: error.message,
          filename: image.originalname
        });
        // Continue with other images
        results.push({ error: error.message, filename: image.originalname });
      }
    }

    return results;
  }

  // Get image info
  async getImageInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'image'
      });

      return {
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at,
        url: result.secure_url,
        metadata: result
      };

    } catch (error) {
      logger.error('Get image info failed', {
        error: error.message,
        publicId
      });
      throw error;
    }
  }

  // List images in folder
  async listImagesInFolder(folder, options = {}) {
    try {
      const { max_results = 100, next_cursor } = options;

      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results,
        next_cursor,
        resource_type: 'image'
      });

      return {
        images: result.resources.map(resource => ({
          publicId: resource.public_id,
          url: resource.secure_url,
          format: resource.format,
          width: resource.width,
          height: resource.height,
          bytes: resource.bytes,
          createdAt: resource.created_at
        })),
        nextCursor: result.next_cursor,
        total: result.resources.length
      };

    } catch (error) {
      logger.error('List images failed', {
        error: error.message,
        folder
      });
      throw error;
    }
  }

  // Rename image
  async renameImage(fromPublicId, toPublicId) {
    try {
      const result = await cloudinary.uploader.rename(fromPublicId, toPublicId);

      logger.info('Image renamed', {
        from: fromPublicId,
        to: toPublicId
      });

      return result;

    } catch (error) {
      logger.error('Rename image failed', {
        error: error.message,
        from: fromPublicId,
        to: toPublicId
      });
      throw error;
    }
  }

  // Copy image
  async copyImage(fromPublicId, toPublicId) {
    try {
      const result = await cloudinary.uploader.copy(fromPublicId, toPublicId);

      logger.info('Image copied', {
        from: fromPublicId,
        to: toPublicId
      });

      return result;

    } catch (error) {
      logger.error('Copy image failed', {
        error: error.message,
        from: fromPublicId,
        to: toPublicId
      });
      throw error;
    }
  }

  // Check if configured
  isConfigured() {
    return !!(process.env.CLOUDINARY_CLOUD_NAME &&
              process.env.CLOUDINARY_API_KEY &&
              process.env.CLOUDINARY_API_SECRET);
  }
}

export default new CloudinaryService();
