const logger = require('../utils/logger');

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true,
    });

    if (error) {
      logger.warn(
        `Validation error for ${req.method} ${req.path}:`,
        error.details
      );

      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

/**
 * Validate request body
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate request query parameters
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate request parameters
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Validate file upload
 */
const validateFile = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = false,
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        message: 'File is required',
      });
    }

    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        });
      }

      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type not allowed. Allowed types: ${allowedTypes.join(
            ', '
          )}`,
        });
      }
    }

    next();
  };
};

/**
 * Validate multiple files
 */
const validateFiles = (options = {}) => {
  const {
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    required = false,
  } = options;

  return (req, res, next) => {
    if (!req.files && required) {
      return res.status(400).json({
        success: false,
        message: 'Files are required',
      });
    }

    if (req.files) {
      const files = Array.isArray(req.files)
        ? req.files
        : Object.values(req.files);

      // Check number of files
      if (files.length > maxFiles) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${maxFiles} files allowed`,
        });
      }

      // Check each file
      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            message: `File ${file.originalname} size must be less than ${
              maxSize / (1024 * 1024)
            }MB`,
          });
        }

        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `File type not allowed for ${
              file.originalname
            }. Allowed types: ${allowedTypes.join(', ')}`,
          });
        }
      }
    }

    next();
  };
};

/**
 * Sanitize request data
 */
const sanitize = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query
  if (req.query) {
    Object.keys(req.query).forEach((key) => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
      });
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0',
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100',
    });
  }

  req.query.page = page;
  req.query.limit = limit;
  next();
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  validateFiles,
  sanitize,
  validateObjectId,
  validatePagination,
};
