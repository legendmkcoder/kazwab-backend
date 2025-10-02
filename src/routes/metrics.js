const express = require('express');
const router = express.Router();

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
const {
  uploadSingleFile,
  handleUploadError,
  uploadToBackblaze,
} = require('../middleware/upload');
const {
  impactMetricValidation,
  successStoryValidation,
} = require('../utils/validators');

// Import models
const ImpactMetric = require('../models/ImpactMetricModel');
const SuccessStory = require('../models/SuccessStoryModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Public routes
/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Get impact metrics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Impact metrics retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const metrics = await ImpactMetric.findActive();

    res.json({
      success: true,
      data: {
        metrics: metrics.map((metric) => metric.getPublicData()),
      },
    });
  } catch (error) {
    logger.error('Get impact metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get impact metrics',
    });
  }
});

/**
 * @swagger
 * /api/metrics/success-stories:
 *   get:
 *     summary: Get success stories
 *     tags: [Metrics]
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
 *           enum: [zakkat_beneficiary, waqf_beneficiary, community_project]
 *     responses:
 *       200:
 *         description: Success stories retrieved successfully
 */
router.get('/success-stories', validatePagination, async (req, res) => {
  try {
    const { page, limit, storyType } = req.query;

    const options = { page, limit, storyType };
    const stories = await SuccessStory.search(null, options);
    const total = await SuccessStory.countDocuments({ isVerified: true });

    res.json({
      success: true,
      data: {
        stories: stories.map((story) => story.getPublicData()),
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

// Protected routes
/**
 * @swagger
 * /api/metrics:
 *   post:
 *     summary: Create impact metric (Content Manager + Admin)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - value
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               value:
 *                 type: number
 *               unit:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [zakkat_collected, beneficiaries, transparency, projects]
 *               displayOrder:
 *                 type: number
 *     responses:
 *       201:
 *         description: Impact metric created successfully
 */
router.post(
  '/',
  authenticateToken,
  requireContentManager,
  validateBody(impactMetricValidation.create),
  async (req, res) => {
    try {
      const metric = new ImpactMetric(req.body);
      await metric.save();

      logger.info(
        `Impact metric created: ${metric.title} by ${req.user.email}`
      );

      res.status(201).json({
        success: true,
        message: 'Impact metric created successfully',
        data: {
          metric: metric.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Create impact metric error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create impact metric',
      });
    }
  }
);

/**
 * @swagger
 * /api/metrics/{id}:
 *   put:
 *     summary: Update impact metric (Content Manager + Admin)
 *     tags: [Metrics]
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
 *         description: Impact metric updated successfully
 */
router.put(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  validateBody(impactMetricValidation.update),
  async (req, res) => {
    try {
      const { id } = req.params;

      const metric = await ImpactMetric.findById(id);
      if (!metric) {
        return res.status(404).json({
          success: false,
          message: 'Impact metric not found',
        });
      }

      Object.assign(metric, req.body);
      await metric.save();

      logger.info(
        `Impact metric updated: ${metric.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Impact metric updated successfully',
        data: {
          metric: metric.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Update impact metric error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update impact metric',
      });
    }
  }
);

/**
 * @swagger
 * /api/metrics/{id}:
 *   delete:
 *     summary: Delete impact metric (Content Manager + Admin)
 *     tags: [Metrics]
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
 *         description: Impact metric deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const metric = await ImpactMetric.findById(id);
      if (!metric) {
        return res.status(404).json({
          success: false,
          message: 'Impact metric not found',
        });
      }

      await metric.remove();

      logger.info(
        `Impact metric deleted: ${metric.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Impact metric deleted successfully',
      });
    } catch (error) {
      logger.error('Delete impact metric error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete impact metric',
      });
    }
  }
);

// Success stories routes
/**
 * @swagger
 * /api/metrics/success-stories:
 *   post:
 *     summary: Create success story (Content Manager + Admin)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - storyType
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               beneficiaryName:
 *                 type: string
 *               beneficiaryLocation:
 *                 type: string
 *               storyType:
 *                 type: string
 *                 enum: [zakkat_beneficiary, waqf_beneficiary, community_project]
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Success story created successfully
 */
router.post(
  '/success-stories',
  authenticateToken,
  requireContentManager,
  validateBody(successStoryValidation.create),
  async (req, res) => {
    try {
      const story = new SuccessStory(req.body);
      await story.save();

      logger.info(`Success story created: ${story.title} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Success story created successfully',
        data: {
          story: story.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Create success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/metrics/success-stories/{id}:
 *   put:
 *     summary: Update success story (Content Manager + Admin)
 *     tags: [Metrics]
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
  '/success-stories/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  validateBody(successStoryValidation.update),
  async (req, res) => {
    try {
      const { id } = req.params;

      const story = await SuccessStory.findById(id);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      Object.assign(story, req.body);
      await story.save();

      logger.info(`Success story updated: ${story.title} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Success story updated successfully',
        data: {
          story: story.getAdminData(),
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
 * /api/metrics/success-stories/{id}:
 *   delete:
 *     summary: Delete success story (Content Manager + Admin)
 *     tags: [Metrics]
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
  '/success-stories/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const story = await SuccessStory.findById(id);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await story.remove();

      logger.info(`Success story deleted: ${story.title} by ${req.user.email}`);

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

/**
 * @swagger
 * /api/metrics/success-stories/{id}/verify:
 *   post:
 *     summary: Verify success story (Content Manager + Admin)
 *     tags: [Metrics]
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
 *         description: Success story verified successfully
 */
router.post(
  '/success-stories/:id/verify',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const story = await SuccessStory.findById(id);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await story.verify();

      logger.info(
        `Success story verified: ${story.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Success story verified successfully',
        data: {
          story: story.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Verify success story error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify success story',
      });
    }
  }
);

/**
 * @swagger
 * /api/metrics/success-stories/{id}/toggle-featured:
 *   post:
 *     summary: Toggle featured status (Content Manager + Admin)
 *     tags: [Metrics]
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
  '/success-stories/:id/toggle-featured',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const story = await SuccessStory.findById(id);
      if (!story) {
        return res.status(404).json({
          success: false,
          message: 'Success story not found',
        });
      }

      await story.toggleFeatured();

      logger.info(
        `Success story featured status toggled: ${story.title} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Featured status toggled successfully',
        data: {
          story: story.getAdminData(),
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

// Image upload route
router.post(
  '/success-stories/upload-image',
  authenticateToken,
  requireContentManager,
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

      // Upload to Backblaze B2
      const uploadResult = await uploadToBackblaze(req.file, 'success-stories');

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: uploadResult.publicUrl || uploadResult.fileUrl,
          filename: uploadResult.fileName,
        },
      });
    } catch (error) {
      logger.error('Upload success story image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
    }
  }
);

module.exports = router;
