const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');
const fs = require('fs');

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (filePath, options = {}) => {
  try {
    const {
      folder = 'kazwab',
      transformation = {},
      public_id = null,
      overwrite = false,
    } = options;

    const uploadOptions = {
      folder,
      overwrite,
      resource_type: 'image',
      ...transformation,
    };

    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    logger.info(`Image uploaded successfully: ${result.public_id}`);

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at,
    };
  } catch (error) {
    logger.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple images to Cloudinary
 */
const uploadMultipleImages = async (filePaths, options = {}) => {
  try {
    const uploadPromises = filePaths.map((filePath) =>
      uploadImage(filePath, options)
    );
    const results = await Promise.all(uploadPromises);

    logger.info(
      `Multiple images uploaded successfully: ${results.length} images`
    );

    return results;
  } catch (error) {
    logger.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Transform image using Cloudinary
 */
const transformImage = async (publicId, transformations = {}) => {
  try {
    const url = cloudinary.url(publicId, {
      transformation: transformations,
    });

    return url;
  } catch (error) {
    logger.error('Error transforming image:', error);
    throw error;
  }
};

/**
 * Generate responsive image URLs
 */
const generateResponsiveImages = (publicId, options = {}) => {
  const {
    widths = [320, 640, 960, 1280, 1920],
    quality = 'auto',
    format = 'auto',
  } = options;

  const responsiveImages = {};

  widths.forEach((width) => {
    responsiveImages[width] = cloudinary.url(publicId, {
      transformation: [{ width, quality, format, crop: 'scale' }],
    });
  });

  return responsiveImages;
};

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      logger.info(`Image deleted successfully: ${publicId}`);
      return true;
    } else {
      logger.warn(`Image deletion failed: ${publicId}`);
      return false;
    }
  } catch (error) {
    logger.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete multiple images from Cloudinary
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    const results = await Promise.all(deletePromises);

    const successCount = results.filter((result) => result).length;
    logger.info(
      `Multiple images deleted: ${successCount}/${publicIds.length} successful`
    );

    return {
      total: publicIds.length,
      successful: successCount,
      failed: publicIds.length - successCount,
    };
  } catch (error) {
    logger.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Optimize image for web
 */
const optimizeImage = async (filePath, options = {}) => {
  try {
    const {
      quality = 80,
      format = 'auto',
      width = null,
      height = null,
      crop = 'scale',
    } = options;

    const transformation = {
      quality,
      format,
    };

    if (width) transformation.width = width;
    if (height) transformation.height = height;
    if (crop) transformation.crop = crop;

    const result = await uploadImage(filePath, {
      transformation: [transformation],
    });

    return result;
  } catch (error) {
    logger.error('Error optimizing image:', error);
    throw error;
  }
};

/**
 * Create thumbnail from image
 */
const createThumbnail = async (publicId, options = {}) => {
  try {
    const {
      width = 300,
      height = 200,
      crop = 'fill',
      gravity = 'auto',
    } = options;

    const url = cloudinary.url(publicId, {
      transformation: [{ width, height, crop, gravity }],
    });

    return url;
  } catch (error) {
    logger.error('Error creating thumbnail:', error);
    throw error;
  }
};

/**
 * Get image information from Cloudinary
 */
const getImageInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      createdAt: result.created_at,
      tags: result.tags || [],
      context: result.context || {},
    };
  } catch (error) {
    logger.error('Error getting image info:', error);
    throw error;
  }
};

/**
 * Add tags to image
 */
const addImageTags = async (publicId, tags) => {
  try {
    const result = await cloudinary.uploader.add_tag(tags, [publicId]);

    if (result.result === 'ok') {
      logger.info(`Tags added to image: ${publicId}`);
      return true;
    } else {
      logger.warn(`Failed to add tags to image: ${publicId}`);
      return false;
    }
  } catch (error) {
    logger.error('Error adding tags to image:', error);
    throw error;
  }
};

/**
 * Remove tags from image
 */
const removeImageTags = async (publicId, tags) => {
  try {
    const result = await cloudinary.uploader.remove_tag(tags, [publicId]);

    if (result.result === 'ok') {
      logger.info(`Tags removed from image: ${publicId}`);
      return true;
    } else {
      logger.warn(`Failed to remove tags from image: ${publicId}`);
      return false;
    }
  } catch (error) {
    logger.error('Error removing tags from image:', error);
    throw error;
  }
};

/**
 * Clean up local file after upload
 */
const cleanupLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Local file cleaned up: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error cleaning up local file:', error);
  }
};

/**
 * Process and upload image with cleanup
 */
const processAndUploadImage = async (filePath, options = {}) => {
  try {
    const result = await uploadImage(filePath, options);

    // Clean up local file
    cleanupLocalFile(filePath);

    return result;
  } catch (error) {
    // Clean up local file even if upload fails
    cleanupLocalFile(filePath);
    throw error;
  }
};

/**
 * Generate image URL with specific transformations
 */
const generateImageUrl = (publicId, transformations = []) => {
  try {
    return cloudinary.url(publicId, {
      transformation: transformations,
    });
  } catch (error) {
    logger.error('Error generating image URL:', error);
    throw error;
  }
};

/**
 * Get image statistics
 */
const getImageStats = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      fields: 'public_id,bytes,width,height,format,created_at',
    });

    return {
      size: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
      createdAt: result.created_at,
    };
  } catch (error) {
    logger.error('Error getting image stats:', error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  transformImage,
  generateResponsiveImages,
  deleteImage,
  deleteMultipleImages,
  optimizeImage,
  createThumbnail,
  getImageInfo,
  addImageTags,
  removeImageTags,
  cleanupLocalFile,
  processAndUploadImage,
  generateImageUrl,
  getImageStats,
};
