const express = require('express');
const router = express.Router();

// Import webhook controller
const {
  handleFlutterwaveWebhook,
} = require('../controllers/webhookController');

/**
 * @swagger
 * /api/webhooks/flutterwave:
 *   post:
 *     summary: Handle Flutterwave webhook notifications
 *     tags: [Webhooks]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 description: Webhook event type
 *               data:
 *                 type: object
 *                 description: Event data
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid signature or payload
 */
router.post('/flutterwave', handleFlutterwaveWebhook);

module.exports = router;
