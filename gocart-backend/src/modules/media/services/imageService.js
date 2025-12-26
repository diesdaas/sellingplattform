import sharp from 'sharp';
import { logger } from '@gocart/shared';

class ImageService {
  // Validate image file
  validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    return true;
  }

  // Get image metadata
  async getImageMetadata(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        channels: metadata.channels,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: buffer.length
      };

    } catch (error) {
      logger.error('Get image metadata failed', { error: error.message });
      throw error;
    }
  }

  // Resize image
  async resizeImage(buffer, options = {}) {
    try {
      const { width, height, fit = 'cover', quality = 80 } = options;

      let sharpInstance = sharp(buffer);

      if (width || height) {
        sharpInstance = sharpInstance.resize(width, height, {
          fit,
          withoutEnlargement: true
        });
      }

      // Set quality for JPEG
      if (quality && quality < 100) {
        sharpInstance = sharpInstance.jpeg({ quality });
      }

      const resizedBuffer = await sharpInstance.toBuffer();

      logger.info('Image resized', {
        originalSize: buffer.length,
        newSize: resizedBuffer.length,
        width,
        height,
        quality
      });

      return resizedBuffer;

    } catch (error) {
      logger.error('Resize image failed', { error: error.message });
      throw error;
    }
  }

  // Convert image format
  async convertImage(buffer, format = 'jpeg', quality = 80) {
    try {
      let sharpInstance = sharp(buffer);

      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png();
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const convertedBuffer = await sharpInstance.toBuffer();

      logger.info('Image converted', {
        originalSize: buffer.length,
        newSize: convertedBuffer.length,
        format,
        quality
      });

      return convertedBuffer;

    } catch (error) {
      logger.error('Convert image failed', { error: error.message });
      throw error;
    }
  }

  // Create thumbnail
  async createThumbnail(buffer, size = 150) {
    try {
      const thumbnail = await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      logger.info('Thumbnail created', {
        originalSize: buffer.length,
        thumbnailSize: thumbnail.length,
        size
      });

      return thumbnail;

    } catch (error) {
      logger.error('Create thumbnail failed', { error: error.message });
      throw error;
    }
  }

  // Optimize image for web
  async optimizeForWeb(buffer, options = {}) {
    try {
      const {
        maxWidth = 1920,
        quality = 80,
        format = 'auto'
      } = options;

      let sharpInstance = sharp(buffer);

      // Get metadata
      const metadata = await sharpInstance.metadata();

      // Resize if too large
      if (metadata.width > maxWidth) {
        sharpInstance = sharpInstance.resize(maxWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert to optimal format
      if (format === 'auto') {
        // Use WebP if supported, otherwise JPEG
        sharpInstance = sharpInstance.webp({ quality });
      } else {
        sharpInstance = sharpInstance.jpeg({ quality });
      }

      const optimizedBuffer = await sharpInstance.toBuffer();

      logger.info('Image optimized for web', {
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        reduction: ((buffer.length - optimizedBuffer.length) / buffer.length * 100).toFixed(1) + '%'
      });

      return optimizedBuffer;

    } catch (error) {
      logger.error('Optimize for web failed', { error: error.message });
      throw error;
    }
  }

  // Generate image variants
  async generateVariants(buffer, variants = []) {
    try {
      const generatedVariants = {};

      for (const variant of variants) {
        const {
          name,
          width,
          height,
          format = 'jpeg',
          quality = 80,
          fit = 'cover'
        } = variant;

        let sharpInstance = sharp(buffer);

        if (width || height) {
          sharpInstance = sharpInstance.resize(width, height, { fit });
        }

        // Apply format
        switch (format) {
          case 'jpeg':
            sharpInstance = sharpInstance.jpeg({ quality });
            break;
          case 'png':
            sharpInstance = sharpInstance.png();
            break;
          case 'webp':
            sharpInstance = sharpInstance.webp({ quality });
            break;
        }

        const variantBuffer = await sharpInstance.toBuffer();
        generatedVariants[name] = variantBuffer;

        logger.info(`Variant ${name} generated`, {
          size: variantBuffer.length,
          width,
          height,
          format
        });
      }

      return generatedVariants;

    } catch (error) {
      logger.error('Generate variants failed', { error: error.message });
      throw error;
    }
  }

  // Check if image is safe (basic check)
  async isImageSafe(buffer) {
    try {
      // Get image stats
      const stats = await sharp(buffer).stats();

      // Check for suspicious patterns (very basic)
      const { entropy, unique } = stats;

      // This is a very basic check - in production you'd want more sophisticated
      // content moderation, perhaps using services like AWS Rekognition
      const isSuspicious = entropy < 5 || unique < 100;

      return !isSuspicious;

    } catch (error) {
      logger.error('Image safety check failed', { error: error.message });
      return false;
    }
  }

  // Calculate image dimensions for responsive design
  calculateResponsiveDimensions(originalWidth, originalHeight, breakpoints = [320, 640, 1024, 1920]) {
    const aspectRatio = originalWidth / originalHeight;
    const dimensions = {};

    breakpoints.forEach(breakpoint => {
      const width = Math.min(breakpoint, originalWidth);
      const height = Math.round(width / aspectRatio);
      dimensions[`${breakpoint}w`] = { width, height };
    });

    return dimensions;
  }

  // Get image placeholder (blur hash or simple color)
  async generatePlaceholder(buffer) {
    try {
      // Get dominant color
      const { dominant } = await sharp(buffer).stats();

      // Return a simple colored placeholder
      // In production, you might want to use blurhash or thumbhash
      return {
        type: 'color',
        color: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
        width: 10,
        height: 10
      };

    } catch (error) {
      logger.error('Generate placeholder failed', { error: error.message });
      return {
        type: 'color',
        color: '#cccccc',
        width: 10,
        height: 10
      };
    }
  }
}

export default new ImageService();
