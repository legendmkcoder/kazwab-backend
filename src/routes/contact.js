const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Import middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  validateBody,
  validateObjectId,
  validatePagination,
} = require('../middleware/validation');

// Import models
const Contact = require('../models/ContactModel');

// Import utilities
const { createPagination } = require('../utils/helpers');
const logger = require('../utils/logger');

// Validation schemas
const contactValidation = {
  create: Joi.object({
    fullName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
        'any.required': 'Phone number is required',
      }),
    subject: Joi.string().min(5).max(200).required().messages({
      'string.min': 'Subject must be at least 5 characters long',
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required',
    }),
    message: Joi.string().min(10).max(2000).required().messages({
      'string.min': 'Message must be at least 10 characters long',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required',
    }),
  }),
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('unread', 'read', 'replied', 'archived')
      .required()
      .messages({
        'any.only': 'Status must be one of: unread, read, replied, archived',
        'any.required': 'Status is required',
      }),
  }),
};

// Public routes
/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit contact message (Public)
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phoneNumber
 *               - subject
 *               - message
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Contact message submitted successfully
 */
router.post('/', validateBody(contactValidation.create), async (req, res) => {
  try {
    const contactData = {
      ...req.body,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    const contact = new Contact(contactData);
    await contact.save();

    logger.info(
      `Contact message submitted: ${contact.fullName} (${contact.email})`
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
    });
  } catch (error) {
    logger.error('Submit contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit message. Please try again later.',
    });
  }
});

// Protected routes (Admin only)
/**
 * @swagger
 * /api/contact:
 *   get:
 *     summary: Get all contact messages (Admin only)
 *     tags: [Contact]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, replied, archived]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact messages retrieved successfully
 */
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  validatePagination,
  async (req, res) => {
    try {
      const { page, limit, status, search } = req.query;

      const options = { page, limit, status };
      const contacts = await Contact.search(search, options);
      const total = await Contact.countDocuments();

      res.json({
        success: true,
        data: {
          contacts: contacts.map((contact) => contact.adminData),
          pagination: createPagination(page, limit, total),
        },
      });
    } catch (error) {
      logger.error('Get contact messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact messages',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/{id}:
 *   get:
 *     summary: Get contact message by ID (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message retrieved successfully
 */
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      // Mark as read if it's unread
      if (contact.status === 'unread') {
        await contact.markAsRead();
      }

      res.json({
        success: true,
        data: {
          contact: contact.adminData,
        },
      });
    } catch (error) {
      logger.error('Get contact message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact message',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/unread:
 *   get:
 *     summary: Get unread contact messages (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread contact messages retrieved successfully
 */
router.get('/unread', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const unreadContacts = await Contact.findUnread();

    res.json({
      success: true,
      data: {
        unreadContacts: unreadContacts.map((contact) => contact.adminData),
        count: unreadContacts.length,
      },
    });
  } catch (error) {
    logger.error('Get unread contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread contact messages',
    });
  }
});

/**
 * @swagger
 * /api/contact/{id}/status:
 *   put:
 *     summary: Update contact message status (Admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [unread, read, replied, archived]
 *     responses:
 *       200:
 *         description: Contact message status updated successfully
 */
router.put(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  validateBody(contactValidation.updateStatus),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      contact.status = status;
      await contact.save();

      logger.info(
        `Contact message status updated: ${contact.fullName} -> ${status} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Contact message status updated successfully',
        data: {
          contact: contact.adminData,
        },
      });
    } catch (error) {
      logger.error('Update contact message status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update contact message status',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/{id}/mark-read:
 *   post:
 *     summary: Mark contact message as read (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message marked as read successfully
 */
router.post(
  '/:id/mark-read',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      await contact.markAsRead();

      logger.info(
        `Contact message marked as read: ${contact.fullName} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Contact message marked as read successfully',
        data: {
          contact: contact.adminData,
        },
      });
    } catch (error) {
      logger.error('Mark contact message as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark contact message as read',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/{id}/mark-replied:
 *   post:
 *     summary: Mark contact message as replied (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message marked as replied successfully
 */
router.post(
  '/:id/mark-replied',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      await contact.markAsReplied();

      logger.info(
        `Contact message marked as replied: ${contact.fullName} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Contact message marked as replied successfully',
        data: {
          contact: contact.adminData,
        },
      });
    } catch (error) {
      logger.error('Mark contact message as replied error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark contact message as replied',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/{id}/archive:
 *   post:
 *     summary: Archive contact message (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message archived successfully
 */
router.post(
  '/:id/archive',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      await contact.archive();

      logger.info(
        `Contact message archived: ${contact.fullName} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Contact message archived successfully',
        data: {
          contact: contact.adminData,
        },
      });
    } catch (error) {
      logger.error('Archive contact message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to archive contact message',
      });
    }
  }
);

/**
 * @swagger
 * /api/contact/{id}:
 *   delete:
 *     summary: Delete contact message (Admin only)
 *     tags: [Contact]
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
 *         description: Contact message deleted successfully
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await Contact.findById(id);
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact message not found',
        });
      }

      await Contact.findByIdAndDelete(id);

      logger.info(
        `Contact message deleted: ${contact.fullName} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'Contact message deleted successfully',
      });
    } catch (error) {
      logger.error('Delete contact message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact message',
      });
    }
  }
);

module.exports = router;
