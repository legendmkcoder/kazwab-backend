const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Import middleware
const {
  authenticateToken,
  requireAdmin,
  requireContentManager,
} = require('../middleware/auth');
const {
  validateBody,
  validateObjectId,
  validatePagination,
} = require('../middleware/validation');

// Import models
const SuccessStory = require('../models/SuccessStoryModel');
const NewsCategory = require('../models/NewsCategoryModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Validation schemas
const successStoryValidation = {
  create: Joi.object({
    // Your Name
    submittedBy: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Your name is required',
    }),
    // Location
    location: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Location must be at least 2 characters long',
      'string.max': 'Location cannot exceed 200 characters',
      'any.required': 'Location is required',
    }),
    // Category (from the category we created)
    categoryId: Joi.string().hex().length(24).required().messages({
      'string.hex': 'Category ID must be a valid ObjectId',
      'string.length': 'Category ID must be 24 characters long',
      'any.required': 'Category is required',
    }),
    // Email
    submittedEmail: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    // Your Story
    content: Joi.string().min(50).max(5000).required().messages({
      'string.min': 'Story must be at least 50 characters long',
      'string.max': 'Story cannot exceed 5000 characters',
      'any.required': 'Your story is required',
    }),
    // Rating
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
      'any.required': 'Rating is required',
    }),
    // Optional image
    imageUrl: Joi.string().optional(),
  }),
  update: Joi.object({
    submittedBy: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
    location: Joi.string().min(2).max(200).optional().messages({
      'string.min': 'Location must be at least 2 characters long',
      'string.max': 'Location cannot exceed 200 characters',
    }),
    categoryId: Joi.string().hex().length(24).optional().messages({
      'string.hex': 'Category ID must be a valid ObjectId',
      'string.length': 'Category ID must be 24 characters long',
    }),
    submittedEmail: Joi.string().email().optional().messages({
      'string.email': 'Please enter a valid email address',
    }),
    content: Joi.string().min(50).max(5000).optional().messages({
      'string.min': 'Story must be at least 50 characters long',
      'string.max': 'Story cannot exceed 5000 characters',
    }),
    imageUrl: Joi.string().optional(),
    rating: Joi.number().integer().min(1).max(5).optional().messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
    }),
    featured: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }),
};

// Public routes
/**
 * @swagger
 * /api/success-stories/categories:
 *   get:
 *     summary: Get available success story categories (Public)
 *     tags: [Success Stories]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await NewsCategory.find({ isActive: true }).sort({
      name: 1,
    });

    res.json({
      success: true,
      data: {
        categories: categories.map((category) => ({
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
        })),
      },
    });
  } catch (error) {
    logger.error('Get success story categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
    });
  }
});

/**
 * @swagger
 * /api/success-stories:
 *   get:
 *     summary: Get all verified success stories (Public)
 *     tags: [Success Stories]
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
 *         name: storyType
 *         schema:
 *           type: string
 *           enum: [technology, healthcare, education, environment, social, economic]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success stories retrieved successfully
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page, limit, categoryId, search } = req.query;

    const options = { page, limit, categoryId, verified: true };
    const successStories = await SuccessStory.search(search, options);
    const total = await SuccessStory.countDocuments({
      isVerified: true,
      isActive: true,
    });

    res.json({
      success: true,
      data: {
        successStories: successStories.map((story) => story.publicData),
        pagination: createPagination(page, limit, total),
      },
    });
  } catch (error) {
    logger.error('Get success stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get success stories',
    });
  }
});

/**
 * @swagger
 * /api/success-stories/{id}:
 *   get:
 *     summary: Get success story by ID (Public)
 *     tags: [Success Stories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success story retrieved successfully
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const successStory = await SuccessStory.findById(id).populate(
      'categoryId',
      'name slug description'
    );
    if (!successStory || !successStory.isVerified || !successStory.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Success story not found',
      });
    }

    // Increment view count
    await successStory.incrementViewCount();

    res.json({
      success: true,
      data: {
        successStory: successStory.publicData,
      },
    });
  } catch (error) {
    logger.error('Get success story error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get success story',
    });
  }
});

/**
 * @swagger
 * /api/success-stories/featured:
 *   get:
 *     summary: Get featured success stories (Public)
 *     tags: [Success Stories]
 *     responses:
 *       200:
 *         description: Featured success stories retrieved successfully
 */
router.get('/featured', async (req, res) => {
  try {
    const featuredStories = await SuccessStory.findFeatured();

    res.json({
      success: true,
      data: {
        featuredStories: featuredStories.map((story) => story.publicData),
      },
    });
  } catch (error) {
    logger.error('Get featured success stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured success stories',
    });
  }
});

/**
 * @swagger
 * /api/success-stories:
 *   post:
 *     summary: Submit success story (Public)
 *     tags: [Success Stories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - submittedBy
 *               - location
 *               - categoryId
 *               - submittedEmail
 *               - content
 *               - rating
 *             properties:
 *               submittedBy:
 *                 type: string
 *                 description: Your name
 *               location:
 *                 type: string
 *                 description: Your location
 *               categoryId:
 *                 type: string
 *                 description: Category ID from the created categories
 *               submittedEmail:
 *                 type: string
 *                 format: email
 *                 description: Your email address
 *               content:
 *                 type: string
 *                 description: Your story
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5
 *               imageUrl:
 *                 type: string
 *                 description: Optional image URL
 *     responses:
 *       201:
 *         description: Success story submitted successfully
 */
router.post(
  '/',
  validateBody(successStoryValidation.create),
  async (req, res) => {
    try {
      const { categoryId } = req.body;

      // Validate that the category exists
      const category = await NewsCategory.findById(categoryId);
      if (!category || !category.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category selected. Please choose a valid category.',
        });
      }

      const storyData = {
        ...req.body,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      };

      const successStory = new SuccessStory(storyData);
      await successStory.save();

      logger.info(
        `Success story submitted by ${storyData.submittedBy} (${storyData.submittedEmail}) in category: ${category.name}`
      );

      res.status(201).json({
        success: true,
        message:
          'Thank you for sharing your success story! It will be reviewed and published soon.',
      });
    } catch (error) {
      logger.error('Submit success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit success story. Please try again later.',
      });
    }
  }
);

// Protected routes (Admin/Content Manager)
/**
 * @swagger
 * /api/success-stories/admin/all:
 *   get:
 *     summary: Get all success stories (Admin/Content Manager)
 *     tags: [Success Stories]
 *     security:
 *       - bearerAuth: []
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
 *         name: storyType
 *         schema:
 *           type: string
 *           enum: [technology, healthcare, education, environment, social, economic]
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success stories retrieved successfully
 */
router.get(
  '/admin/all',
  authenticateToken,
  requireContentManager,
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, categoryId, verified, search, isActive } = req.query;

      const options = {
        page,
        limit,
        categoryId,
        verified,
        isActive,
        adminView: true,
      };
      const successStories = await SuccessStory.search(search, options);

      // Build count query with same filters
      let countQuery = {};
      if (categoryId) countQuery.categoryId = categoryId;
      if (verified !== undefined) countQuery.isVerified = verified === 'true';
      if (isActive !== undefined) countQuery.isActive = isActive === 'true';

      const total = await SuccessStory.countDocuments(countQuery);

      res.json({
        success: true,
        data: {
          successStories: successStories.map((story) => story.adminData),
          pagination: createPagination(page, limit, total),
        },
      });
    } catch (error) {
      logger.error('Get all success stories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get success stories',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/pending:
 *   get:
 *     summary: Get pending success stories (Admin/Content Manager)
 *     tags: [Success Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending success stories retrieved successfully
 */
router.get(
  '/admin/pending',
  authenticateToken,
  requireContentManager,
  async (req, res) => {
    try {
      const pendingStories = await SuccessStory.findPending();

      res.json({
        success: true,
        data: {
          pendingStories: pendingStories.map((story) => story.adminData),
          count: pendingStories.length,
        },
      });
    } catch (error) {
      logger.error('Get pending success stories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pending success stories',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/{id}:
 *   get:
 *     summary: Get success story by ID (Admin/Content Manager)
 *     tags: [Success Stories]
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
 *         description: Success story retrieved successfully
 */
router.get(
  '/admin/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id).populate(
        'categoryId',
        'name slug description'
      );
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      res.json({
        success: true,
        data: {
          successStory: successStory.adminData,
        },
      });
    } catch (error) {
      logger.error('Get success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/{id}/approve:
 *   post:
 *     summary: Approve success story (Admin only)
 *     tags: [Success Stories]
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
 *         description: Success story approved successfully
 */
router.post(
  '/admin/:id/approve',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      if (successStory.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Success story is already approved',
        });
      }

      await successStory.approve(req.user.id);

      // Populate category after approval
      await successStory.populate('categoryId', 'name slug description');

      logger.info(
        `Success story approved: ${successStory.submittedBy} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Success story approved successfully',
        data: {
          successStory: successStory.adminData,
        },
      });
    } catch (error) {
      logger.error('Approve success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/{id}/reject:
 *   post:
 *     summary: Reject success story (Admin only)
 *     tags: [Success Stories]
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
 *         description: Success story rejected successfully
 */
router.post(
  '/admin/:id/reject',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await successStory.reject();

      logger.info(
        `Success story rejected: ${successStory.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Success story rejected successfully',
      });
    } catch (error) {
      logger.error('Reject success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/{id}:
 *   put:
 *     summary: Update success story (Content Manager + Admin)
 *     tags: [Success Stories]
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
 *         description: Success story updated successfully
 */
router.put(
  '/admin/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  validateBody(successStoryValidation.update),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      Object.assign(successStory, req.body);
      await successStory.save();

      // Populate category after update
      await successStory.populate('categoryId', 'name slug description');

      logger.info(
        `Success story updated: ${successStory.submittedBy} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Success story updated successfully',
        data: {
          successStory: successStory.adminData,
        },
      });
    } catch (error) {
      logger.error('Update success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/success-stories/admin/{id}/toggle-featured:
 *   post:
 *     summary: Toggle featured status (Content Manager + Admin)
 *     tags: [Success Stories]
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
  '/admin/:id/toggle-featured',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await successStory.toggleFeatured();

      // Populate category after toggle
      await successStory.populate('categoryId', 'name slug description');

      logger.info(
        `Success story featured status toggled: ${successStory.submittedBy} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Featured status toggled successfully',
        data: {
          successStory: successStory.adminData,
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
 * /api/success-stories/admin/{id}/toggle-active:
 *   post:
 *     summary: Toggle active status (Content Manager + Admin)
 *     tags: [Success Stories]
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
  '/admin/:id/toggle-active',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await successStory.toggleActive();

      // Populate category after toggle
      await successStory.populate('categoryId', 'name slug description');

      logger.info(
        `Success story active status toggled: ${successStory.submittedBy} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Active status toggled successfully',
        data: {
          successStory: successStory.adminData,
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

/**
 * @swagger
 * /api/success-stories/admin/{id}:
 *   delete:
 *     summary: Delete success story (Admin only)
 *     tags: [Success Stories]
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
 *         description: Success story deleted successfully
 */
router.delete(
  '/admin/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const successStory = await SuccessStory.findById(id);
      if (!successStory) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await SuccessStory.findByIdAndDelete(id);

      logger.info(
        `Success story deleted: ${successStory.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Success story deleted successfully',
      });
    } catch (error) {
      logger.error('Delete success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete success story',
      });
    }
  }
);

module.exports = router;
