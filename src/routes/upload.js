const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateToken, requireNewsEditor } = require('../middleware/auth');
const {
  uploadSingleFile,
  handleUploadError,
  uploadToBackblaze,
} = require('../middleware/upload');

// Error handling utility
const handleError = (error, res, operation = 'operation') => {
  logger.error(`${operation} error:`, error);

  // Handle validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(
      (err) => err.message
    );
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validationErrors,
    });
  }

  // Handle duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists',
    });
  }

  // Handle ObjectId errors
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // Handle other errors
  res.status(500).json({
    success: false,
    message: `Failed to ${operation}`,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file to Backblaze B2 (News Editor + Admin)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 5MB)
 *               type:
 *                 type: string
 *                 enum: [image, document, general]
 *                 description: File type for organization (optional)
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Upload error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authenticateToken,
  requireNewsEditor,
  uploadSingleFile,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Determine prefix based on file type or mimetype
      let prefix = 'general';
      if (req.body.type === 'image' || req.file.mimetype.startsWith('image/')) {
        prefix = 'images';
      } else if (
        req.body.type === 'document' ||
        req.file.mimetype.includes('pdf') ||
        req.file.mimetype.includes('word') ||
        req.file.mimetype.includes('document')
      ) {
        prefix = 'documents';
      }

      // Upload to Backblaze B2
      const uploadResult = await uploadToBackblaze(req.file, prefix);

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: uploadResult.publicUrl || uploadResult.fileUrl,
        },
      });
    } catch (error) {
      handleError(error, res, 'upload file');
    }
  }
);

module.exports = router;
