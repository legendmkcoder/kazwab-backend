const multer = require('multer');
const logger = require('../utils/logger');
const backblazeService = require('../services/backblazeService');

// Configure memory storage for Backblaze B2
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  const allowedDocumentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  // Check file type based on field name
  if (file.fieldname === 'featuredImage') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Only image files (JPEG, PNG, GIF, WebP) are allowed for featured images'
        ),
        false
      );
    }
  } else if (file.fieldname === 'document') {
    if (allowedDocumentTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  } else {
    // Allow all file types for other fields
    cb(null, true);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file per request
  },
});

// Specific upload configurations
const uploadSingleImage = upload.single('featuredImage');
const uploadSingleDocument = upload.single('document');
const uploadMultipleImages = upload.array('images', 5); // Max 5 images
const uploadSingleFile = upload.single('file'); // General file upload

// Backblaze B2 upload functions
const uploadToBackblaze = async (file, prefix = '') => {
  try {
    const fileName = backblazeService.generateFileName(
      file.originalname,
      prefix
    );
    const result = await backblazeService.uploadFile(
      file.buffer,
      fileName,
      file.mimetype
    );

    // Construct the friendly public URL format
    // Extract the bucket name and file name from the result
    const bucketName = process.env.BUCKET_NAME;
    const friendlyUrl = `https://f005.backblazeb2.com/file/${bucketName}/${fileName}`;

    // Return the result with the friendly URL
    return {
      ...result,
      fileUrl: friendlyUrl,
      publicUrl: friendlyUrl, // Add both for backward compatibility
    };
  } catch (error) {
    logger.error('Backblaze B2 upload failed:', error);
    throw error;
  }
};

const deleteFromBackblaze = async (fileName) => {
  try {
    if (fileName && fileName.includes('/file/')) {
      // Extract filename from URL
      const urlParts = fileName.split('/file/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const bucketAndFile = filePath.split('/');
        if (bucketAndFile.length > 1) {
          const actualFileName = bucketAndFile.slice(1).join('/');
          await backblazeService.deleteFile(actualFileName);
        }
      }
    } else if (fileName) {
      await backblazeService.deleteFile(fileName);
    }
  } catch (error) {
    logger.error('Backblaze B2 delete failed:', error);
    // Don't throw error, just log it
  }
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files',
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: error.message,
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next();
};

module.exports = {
  uploadSingleImage,
  uploadSingleDocument,
  uploadMultipleImages,
  uploadSingleFile,
  handleUploadError,
  uploadToBackblaze,
  deleteFromBackblaze,
};
