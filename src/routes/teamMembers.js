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
const TeamMember = require('../models/TeamMemberModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Validation schemas
const teamMemberValidation = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    position: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 200 characters',
      'any.required': 'Position is required',
    }),
    image: Joi.string().required().messages({
      'any.required': 'Image URL is required',
    }),
    description: Joi.string().min(20).max(1000).required().messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required',
    }),
    type: Joi.string().valid('board', 'management').required().messages({
      'any.only': 'Type must be either "board" or "management"',
      'any.required': 'Type is required',
    }),
    orderIndex: Joi.number().integer().min(0).optional(),
    socialLinks: Joi.object({
      linkedin: Joi.string().uri().optional(),
      twitter: Joi.string().uri().optional(),
      email: Joi.string().email().optional(),
    }).optional(),
  }),
  update: Joi.object({
    name: Joi.string().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
    position: Joi.string().min(2).max(200).optional().messages({
      'string.min': 'Position must be at least 2 characters long',
      'string.max': 'Position cannot exceed 200 characters',
    }),
    image: Joi.string().optional(),
    description: Joi.string().min(20).max(1000).optional().messages({
      'string.min': 'Description must be at least 20 characters long',
      'string.max': 'Description cannot exceed 1000 characters',
    }),
    type: Joi.string().valid('board', 'management').optional().messages({
      'any.only': 'Type must be either "board" or "management"',
    }),
    isActive: Joi.boolean().optional(),
    orderIndex: Joi.number().integer().min(0).optional(),
    socialLinks: Joi.object({
      linkedin: Joi.string().uri().optional(),
      twitter: Joi.string().uri().optional(),
      email: Joi.string().email().optional(),
    }).optional(),
  }),
};

// Public routes
/**
 * @swagger
 * /api/team-members:
 *   get:
 *     summary: Get all active team members (Public)
 *     tags: [Team Members]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [board, management]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team members retrieved successfully
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page, limit, type, search } = req.query;

    const options = { page, limit, type };
    const teamMembers = await TeamMember.search(search, options);
    const total = await TeamMember.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        teamMembers: teamMembers.map((member) => member.publicData),
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
});

/**
 * @swagger
 * /api/team-members/{id}:
 *   get:
 *     summary: Get team member by ID (Public)
 *     tags: [Team Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member retrieved successfully
 */
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const teamMember = await TeamMember.findById(id);
    if (!teamMember || !teamMember.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    res.json({
      success: true,
      data: {
        teamMember: teamMember.publicData,
      },
    });
  } catch (error) {
    logger.error('Get team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team member',
    });
  }
});

/**
 * @swagger
 * /api/team-members/board:
 *   get:
 *     summary: Get board members (Public)
 *     tags: [Team Members]
 *     responses:
 *       200:
 *         description: Board members retrieved successfully
 */
router.get('/board', async (req, res) => {
  try {
    const boardMembers = await TeamMember.findBoardMembers();

    res.json({
      success: true,
      data: {
        boardMembers: boardMembers.map((member) => member.publicData),
      },
    });
  } catch (error) {
    logger.error('Get board members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get board members',
    });
  }
});

/**
 * @swagger
 * /api/team-members/management:
 *   get:
 *     summary: Get management team (Public)
 *     tags: [Team Members]
 *     responses:
 *       200:
 *         description: Management team retrieved successfully
 */
router.get('/management', async (req, res) => {
  try {
    const managementTeam = await TeamMember.findManagementTeam();

    res.json({
      success: true,
      data: {
        managementTeam: managementTeam.map((member) => member.publicData),
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
 * /api/team-members:
 *   post:
 *     summary: Create team member (Content Manager + Admin)
 *     tags: [Team Members]
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
 *               - image
 *               - description
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               position:
 *                 type: string
 *               image:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [board, management]
 *               orderIndex:
 *                 type: number
 *               socialLinks:
 *                 type: object
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
      const teamMemberData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const teamMember = new TeamMember(teamMemberData);
      await teamMember.save();

      logger.info(
        `Team member created: ${teamMember.name} by ${req.user.email}`
      );

      res.status(201).json({
        success: true,
        message: 'Team member created successfully',
        data: {
          teamMember: teamMember.adminData,
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
 * /api/team-members/{id}:
 *   put:
 *     summary: Update team member (Content Manager + Admin)
 *     tags: [Team Members]
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

      const teamMember = await TeamMember.findById(id);
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      Object.assign(teamMember, req.body, { updatedBy: req.user.id });
      await teamMember.save();

      logger.info(
        `Team member updated: ${teamMember.name} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Team member updated successfully',
        data: {
          teamMember: teamMember.adminData,
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
 * /api/team-members/{id}:
 *   delete:
 *     summary: Delete team member (Content Manager + Admin)
 *     tags: [Team Members]
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

      const teamMember = await TeamMember.findById(id);
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      await TeamMember.findByIdAndDelete(id);

      logger.info(
        `Team member deleted: ${teamMember.name} by ${req.user.email}`
      );

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
 * /api/team-members/{id}/toggle-active:
 *   post:
 *     summary: Toggle active status (Content Manager + Admin)
 *     tags: [Team Members]
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

      const teamMember = await TeamMember.findById(id);
      if (!teamMember) {
        return res.status(404).json({
          success: false,
          message: 'Team member not found',
        });
      }

      await teamMember.toggleActive();

      logger.info(
        `Team member active status toggled: ${teamMember.name} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Active status toggled successfully',
        data: {
          teamMember: teamMember.adminData,
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
