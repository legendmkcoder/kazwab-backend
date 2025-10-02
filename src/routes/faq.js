const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Import middleware
const {
  authenticateToken,
  requireContentManager,
} = require('../middleware/auth');
const {
  validateBody,
  validateObjectId,
  validatePagination,
} = require('../middleware/validation');

// Import models
const FAQ = require('../models/FAQModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Validation schemas
const faqValidation = {
  create: Joi.object({
    question: Joi.string().min(10).max(500).required().messages({
      'string.min': 'Question must be at least 10 characters long',
      'string.max': 'Question cannot exceed 500 characters',
      'any.required': 'Question is required',
    }),
    answer: Joi.string().min(20).max(2000).required().messages({
      'string.min': 'Answer must be at least 20 characters long',
      'string.max': 'Answer cannot exceed 2000 characters',
      'any.required': 'Answer is required',
    }),
    category: Joi.string()
      .valid('general', 'zakkat', 'waqf')
      .required()
      .messages({
        'any.only': 'Category must be one of: general, zakkat, waqf',
        'any.required': 'Category is required',
      }),
    isFeatured: Joi.boolean().optional(),
    orderIndex: Joi.number().integer().min(0).optional(),
  }),
  update: Joi.object({
    question: Joi.string().min(10).max(500).optional().messages({
      'string.min': 'Question must be at least 10 characters long',
      'string.max': 'Question cannot exceed 500 characters',
    }),
    answer: Joi.string().min(20).max(2000).optional().messages({
      'string.min': 'Answer must be at least 20 characters long',
      'string.max': 'Answer cannot exceed 2000 characters',
    }),
    category: Joi.string()
      .valid('general', 'zakkat', 'waqf')
      .optional()
      .messages({
        'any.only': 'Category must be one of: general, zakkat, waqf',
      }),
    isActive: Joi.boolean().optional(),
    isFeatured: Joi.boolean().optional(),
    orderIndex: Joi.number().integer().min(0).optional(),
  }),
};

// Public routes
/**
 * @swagger
 * /api/faq:
 *   get:
 *     summary: Get all active FAQs (Public)
 *     tags: [FAQ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [general, zakkat, waqf]
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page, limit, category, featured, search } = req.query;

    const options = { page, limit, category, featured };
    const faqs = await FAQ.search(search, options);
    const total = await FAQ.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        faqs: faqs.map((faq) => faq.publicData),
        pagination: createPagination(page, limit, total),
      },
    });
  } catch (error) {
    logger.error('Get FAQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQs',
    });
  }
});

/**
 * @swagger
 * /api/faq/{id}:
 *   get:
 *     summary: Get FAQ by ID (Public)
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ retrieved successfully
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq || !faq.isActive) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found',
      });
    }

    // Increment view count
    await faq.incrementViewCount();

    res.json({
      success: true,
      data: {
        faq: faq.publicData,
      },
    });
  } catch (error) {
    logger.error('Get FAQ error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get FAQ',
    });
  }
});

/**
 * @swagger
 * /api/faq/categories:
 *   get:
 *     summary: Get FAQ categories (Public)
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { value: 'general', label: 'General' },
      { value: 'zakkat', label: 'Zakkat' },
      { value: 'waqf', label: 'Waqf' },
    ];

    res.json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    logger.error('Get FAQ categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
    });
  }
});

/**
 * @swagger
 * /api/faq/featured:
 *   get:
 *     summary: Get featured FAQs (Public)
 *     tags: [FAQ]
 *     responses:
 *       200:
 *         description: Featured FAQs retrieved successfully
 */
router.get('/featured', async (req, res) => {
  try {
    const faqs = await FAQ.findFeatured();

    res.json({
      success: true,
      data: {
        faqs: faqs.map((faq) => faq.publicData),
      },
    });
  } catch (error) {
    logger.error('Get featured FAQs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured FAQs',
    });
  }
});

// Protected routes
/**
 * @swagger
 * /api/faq:
 *   post:
 *     summary: Create FAQ (Content Manager + Admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answer
 *               - category
 *             properties:
 *               question:
 *                 type: string
 *               answer:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [general, zakkat, waqf]
 *               isFeatured:
 *                 type: boolean
 *               orderIndex:
 *                 type: number
 *     responses:
 *       201:
 *         description: FAQ created successfully
 */
router.post(
  '/',
  authenticateToken,
  requireContentManager,
  validateBody(faqValidation.create),
  async (req, res) => {
    try {
      const faqData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const faq = new FAQ(faqData);
      await faq.save();

      logger.info(`FAQ created: ${faq.question} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        data: {
          faq: faq.adminData,
        },
      });
    } catch (error) {
      logger.error('Create FAQ error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create FAQ',
      });
    }
  }
);

/**
 * @swagger
 * /api/faq/{id}:
 *   put:
 *     summary: Update FAQ (Content Manager + Admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ updated successfully
 */
router.put(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  validateBody(faqValidation.update),
  async (req, res) => {
    try {
      const { id } = req.params;

      const faq = await FAQ.findById(id);
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found',
        });
      }

      Object.assign(faq, req.body, { updatedBy: req.user.id });
      await faq.save();

      logger.info(`FAQ updated: ${faq.question} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'FAQ updated successfully',
        data: {
          faq: faq.adminData,
        },
      });
    } catch (error) {
      logger.error('Update FAQ error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update FAQ',
      });
    }
  }
);

/**
 * @swagger
 * /api/faq/{id}:
 *   delete:
 *     summary: Delete FAQ (Content Manager + Admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const faq = await FAQ.findById(id);
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found',
        });
      }

      await FAQ.findByIdAndDelete(id);

      logger.info(`FAQ deleted: ${faq.question} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'FAQ deleted successfully',
      });
    } catch (error) {
      logger.error('Delete FAQ error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete FAQ',
      });
    }
  }
);

/**
 * @swagger
 * /api/faq/{id}/toggle-featured:
 *   post:
 *     summary: Toggle featured status (Content Manager + Admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Featured status toggled successfully
 */
router.post(
  '/:id/toggle-featured',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const faq = await FAQ.findById(id);
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found',
        });
      }

      await faq.toggleFeatured();

      logger.info(
        `FAQ featured status toggled: ${faq.question} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Featured status toggled successfully',
        data: {
          faq: faq.adminData,
        },
      });
    } catch (error) {
      logger.error('Toggle featured status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle featured status',
      });
    }
  }
);

/**
 * @swagger
 * /api/faq/{id}/toggle-active:
 *   post:
 *     summary: Toggle active status (Content Manager + Admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active status toggled successfully
 */
router.post(
  '/:id/toggle-active',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const faq = await FAQ.findById(id);
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ not found',
        });
      }

      await faq.toggleActive();

      logger.info(
        `FAQ active status toggled: ${faq.question} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Active status toggled successfully',
        data: {
          faq: faq.adminData,
        },
      });
    } catch (error) {
      logger.error('Toggle active status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle active status',
      });
    }
  }
);

module.exports = router;
