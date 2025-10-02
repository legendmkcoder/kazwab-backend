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
const { teamMemberValidation } = require('../utils/validators');

// Import models
const TeamMember = require('../models/TeamMemberModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Public routes
/**
 * @swagger
 * /api/team/board-directors:
 *   get:
 *     summary: Get board directors
 *     tags: [Team]
 *     responses:
 *       200:
 *         description: Board directors retrieved successfully
 */
router.get('/board-directors', async (req, res) => {
  try {
    const directors = await TeamMember.findBoardDirectors();

    res.json({
      success: true,
      data: {
        directors: directors.map((director) => director.getPublicData()),
      },
    });
  } catch (error) {
    logger.error('Get board directors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get board directors',
    });
  }
});

/**
 * @swagger
 * /api/team/management:
 *   get:
 *     summary: Get management team
 *     tags: [Team]
 *     responses:
 *       200:
 *         description: Management team retrieved successfully
 */
router.get('/management', async (req, res) => {
  try {
    const management = await TeamMember.findManagementTeam();

    res.json({
      success: true,
      data: {
        management: management.map((member) => member.getPublicData()),
      },
    });
  } catch (error) {
    logger.error('Get management team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get management team',
    });
  }
});

// Protected routes
/**
 * @swagger
 * /api/team:
 *   get:
 *     summary: Get all team members (Content Manager + Admin)
 *     tags: [Team]
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
 *         name: memberType
 *         schema:
 *           type: string
 *           enum: [board_director, management_team]
 *     responses:
 *       200:
 *         description: Team members retrieved successfully
 */
router.get(
  '/',
  authenticateToken,
  requireContentManager,
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, memberType } = req.query;
      const skip = (page - 1) * limit;

      let query = {};
      if (memberType) {
        query.memberType = memberType;
      }

      const members = await TeamMember.find(query)
        .sort({ orderIndex: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await TeamMember.countDocuments(query);

      res.json({
        success: true,
        data: {
          members: members.map((member) => member.getAdminData()),
          pagination: createPagination(page, limit, total),
        },
      });
    } catch (error) {
      logger.error('Get team members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get team members',
      });
    }
  }
);

/**
 * @swagger
 * /api/team:
 *   post:
 *     summary: Create team member (Content Manager + Admin)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - position
 *               - memberType
 *             properties:
 *               name:
 *                 type: string
 *               position:
 *                 type: string
 *               description:
 *                 type: string
 *               memberType:
 *                 type: string
 *                 enum: [board_director, management_team]
 *               orderIndex:
 *                 type: number
 *     responses:
 *       201:
 *         description: Team member created successfully
 */
router.post(
  '/',
  authenticateToken,
  requireContentManager,
  validateBody(teamMemberValidation.create),
  async (req, res) => {
    try {
      const member = new TeamMember(req.body);
      await member.save();

      logger.info(`Team member created: ${member.name} by ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Team member created successfully',
        data: {
          member: member.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Create team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create team member',
      });
    }
  }
);

/**
 * @swagger
 * /api/team/{id}:
 *   put:
 *     summary: Update team member (Content Manager + Admin)
 *     tags: [Team]
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
 *         description: Team member updated successfully
 */
router.put(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  validateBody(teamMemberValidation.update),
  async (req, res) => {
    try {
      const { id } = req.params;

      const member = await TeamMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      Object.assign(member, req.body);
      await member.save();

      logger.info(`Team member updated: ${member.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Team member updated successfully',
        data: {
          member: member.getAdminData(),
        },
      });
    } catch (error) {
      logger.error('Update team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update team member',
      });
    }
  }
);

/**
 * @swagger
 * /api/team/{id}:
 *   delete:
 *     summary: Delete team member (Content Manager + Admin)
 *     tags: [Team]
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
 *         description: Team member deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  requireContentManager,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const member = await TeamMember.findById(id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      await member.remove();

      logger.info(`Team member deleted: ${member.name} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'Team member deleted successfully',
      });
    } catch (error) {
      logger.error('Delete team member error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete team member',
      });
    }
  }
);

/**
 * @swagger
 * /api/team/upload-image:
 *   post:
 *     summary: Upload team member image (Content Manager + Admin)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
router.post(
  '/upload-image',
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
      const uploadResult = await uploadToBackblaze(req.file, 'team');

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          imageUrl: uploadResult.publicUrl || uploadResult.fileUrl,
          filename: uploadResult.fileName,
        },
      });
    } catch (error) {
      logger.error('Upload team image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
    }
  }
);

/**
 * @swagger
 * /api/team/reorder:
 *   post:
 *     summary: Reorder team members (Content Manager + Admin)
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberType
 *               - order
 *             properties:
 *               memberType:
 *                 type: string
 *                 enum: [board_director, management_team]
 *               order:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Team members reordered successfully
 */
router.post(
  '/reorder',
  authenticateToken,
  requireContentManager,
  async (req, res) => {
    try {
      const { memberType, order } = req.body;

      if (!memberType || !order || !Array.isArray(order)) {
        return res.status(400).json({
          success: false,
          message: 'Member type and order array are required',
        });
      }

      await TeamMember.reorderMembers(memberType, order);

      logger.info(
        `Team members reordered for ${memberType} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Team members reordered successfully',
      });
    } catch (error) {
      logger.error('Reorder team members error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder team members',
      });
    }
  }
);

module.exports = router;
