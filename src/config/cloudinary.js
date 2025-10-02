const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Only configure Cloudinary if environment variables are present
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Test the connection
  cloudinary.api
    .ping()
    .then(() => {
      logger.info('Cloudinary connected successfully');
    })
    .catch((error) => {
      logger.error('Cloudinary connection failed:', error);
    });
} else {
  logger.warn(
    'Cloudinary credentials not found. Image upload features will be disabled.'
  );
}

module.exports = cloudinary;
