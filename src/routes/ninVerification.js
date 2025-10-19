const express = require('express');
const router = express.Router();
const {
  verifyNIN,
  getNINVerification,
  getAllNINVerifications,
  clearNINCache,
  getCacheStats,
} = require('../controllers/ninVerificationController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * @swagger
 * /api/nin-verification/verify:
 *   post:
 *     summary: Verify a NIN
 *     tags: [NIN Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nin
 *             properties:
 *               nin:
 *                 type: string
 *                 description: 11-digit NIN number
 *                 example: "12345678901"
 *     responses:
 *       200:
 *         description: NIN verified successfully
 *       400:
 *         description: Invalid NIN format or verification failed
 *       404:
 *         description: NIN not found
 *       409:
 *         description: NIN already registered with another account
 */
router.post('/verify', verifyNIN);

/**
 * @swagger
 * /api/nin-verification:
 *   get:
 *     summary: Get all NIN verifications (Admin only)
 *     tags: [NIN Verification]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by NIN, first name, or last name
 *     responses:
 *       200:
 *         description: NIN verifications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', authenticateToken, requireAdmin, getAllNINVerifications);

/**
 * @swagger
 * /api/nin-verification/cache/stats:
 *   get:
 *     summary: Get NIN cache statistics (Admin only)
 *     tags: [NIN Verification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/cache/stats', authenticateToken, requireAdmin, getCacheStats);

/**
 * @swagger
 * /api/nin-verification/{nin}:
 *   get:
 *     summary: Get NIN verification by NIN (Admin only)
 *     tags: [NIN Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nin
 *         required: true
 *         schema:
 *           type: string
 *         description: 11-digit NIN number
 *     responses:
 *       200:
 *         description: NIN verification retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: NIN verification not found
 */
router.get('/:nin', authenticateToken, requireAdmin, getNINVerification);

/**
 * @swagger
 * /api/nin-verification/cache/{nin}:
 *   delete:
 *     summary: Clear NIN from cache (Admin only)
 *     tags: [NIN Verification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nin
 *         required: true
 *         schema:
 *           type: string
 *         description: 11-digit NIN number
 *     responses:
 *       200:
 *         description: NIN cache cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: NIN not found in cache
 */
router.delete('/cache/:nin', authenticateToken, requireAdmin, clearNINCache);

module.exports = router;
