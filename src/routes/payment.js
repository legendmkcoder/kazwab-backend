const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  validateBody,
  validateObjectId,
  validatePagination,
} = require('../middleware/validation');

// Import controllers
const {
  generateApplicantPayment,
  generateUserPayment,
  verifyPaymentStatus,
  getAllPayments,
  getUserPaymentDetails,
  getPaymentStatistics,
  getPaymentById,
  updatePaymentStatus,
} = require('../controllers/paymentController');

// Import validation schemas
const Joi = require('joi');

// Validation schemas
const paymentValidation = {
  generate: Joi.object({
    amount: Joi.number().min(1).required().messages({
      'number.min': 'Amount must be greater than 0',
      'any.required': 'Amount is required',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email is required',
    }),
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    phonenumber: Joi.string().optional().allow(''),
  }),
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('pending', 'successful', 'failed', 'cancelled')
      .required()
      .messages({
        'any.only':
          'Status must be one of: pending, successful, failed, cancelled',
        'any.required': 'Status is required',
      }),
  }),
};

/**
 * @swagger
 * /api/payments/generate:
 *   post:
 *     summary: Generate payment link (Public)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - email
 *               - name
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer email
 *               name:
 *                 type: string
 *                 description: Customer name
 *               phonenumber:
 *                 type: string
 *                 description: Customer phone number (optional)
 *     responses:
 *       200:
 *         description: Payment link generated successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/generate',
  validateBody(paymentValidation.generate),
  generateApplicantPayment
);

/**
 * @swagger
 * /api/payments/generate-user:
 *   post:
 *     summary: Generate payment for authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - email
 *               - name
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 example: 5000
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *               phonenumber:
 *                 type: string
 *                 example: +2348123456789
 *     responses:
 *       200:
 *         description: Payment generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/generate-user',
  authenticateToken,
  validateBody(paymentValidation.generate),
  generateUserPayment
);

/**
 * @swagger
 * /api/payments/verify:
 *   get:
 *     summary: Verify payment status (Public)
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment reference
 *     responses:
 *       200:
 *         description: Payment verification successful
 *       404:
 *         description: Payment not found
 */
router.get('/verify', verifyPaymentStatus);

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User payments retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticateToken, getUserPaymentDetails);

/**
 * @swagger
 * /api/payments/all:
 *   get:
 *     summary: Get all payments (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, successful, failed, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, name, or reference
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/all',
  authenticateToken,
  requireAdmin,
  validatePagination,
  getAllPayments
);

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     summary: Get payment statistics (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/stats', authenticateToken, requireAdmin, getPaymentStatistics);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment by ID (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment retrieved successfully
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  getPaymentById
);

/**
 * @swagger
 * /api/payments/{id}/status:
 *   patch:
 *     summary: Update payment status (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
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
 *                 enum: [pending, successful, failed, cancelled]
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Payment not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.patch(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  validateObjectId('id'),
  validateBody(paymentValidation.updateStatus),
  updatePaymentStatus
);

module.exports = router;
