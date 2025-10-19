const Payment = require('../models/paymentModel');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Handle Flutterwave webhook notifications
 * @route POST /api/webhooks/flutterwave
 * @access Public (webhook)
 */
const handleFlutterwaveWebhook = async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const secretHash = process.env.DEV_FLUTTERWAVE_SECRET_KEY;

    // Verify webhook signature
    if (signature !== secretHash) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({
        success: false,
        message: 'Invalid signature',
      });
    }

    const { event, data } = req.body;

    logger.info(`Flutterwave webhook received: ${event}`, data);

    if (event === 'charge.completed') {
      const { tx_ref, status, amount, charged_amount, payment_type } = data;

      // Find payment record
      const payment = await Payment.findOne({ txRef: tx_ref });

      if (!payment) {
        logger.warn(`Payment not found for tx_ref: ${tx_ref}`);
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      // Update payment status
      if (status === 'successful') {
        await payment.markAsSuccessful(data);
        logger.info(`Payment ${tx_ref} marked as successful`);
      } else {
        await payment.markAsFailed(data);
        logger.info(`Payment ${tx_ref} marked as failed`);
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    }

    // Handle other webhook events if needed
    logger.info(`Unhandled webhook event: ${event}`);

    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

/**
 * Verify webhook signature manually
 * @param {string} payload - Raw payload string
 * @param {string} signature - Webhook signature
 * @param {string} secret - Secret hash
 * @returns {boolean} Signature validity
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

module.exports = {
  handleFlutterwaveWebhook,
  verifyWebhookSignature,
};
