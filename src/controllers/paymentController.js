const Payment = require('../models/paymentModel');
const User = require('../models/UserModel');
const logger = require('../utils/logger');
const {
  generatePayment,
  verifyPayment,
  generateApplicationId,
} = require('../utils/constants');

/**
 * Generate payment for any user (no authentication required)
 * @route POST /api/payments/generate
 * @access Public
 */
const generateApplicantPayment = async (req, res) => {
  try {
    const { amount, email, name, phonenumber } = req.body;

    // Validate required fields
    if (!amount || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Amount, email, and name are required',
      });
    }

    // Generate transaction reference
    const tx_ref = generateApplicationId();

    // Prepare payment data
    const paymentData = {
      tx_ref: tx_ref,
      amount: amount,
      email: email,
      phonenumber: phonenumber || '',
      name: name,
    };

    // Generate payment link
    const paymentResponse = await generatePayment(paymentData);

    logger.info(`Payment generated for ${email}: ${tx_ref}`);

    if (!paymentResponse || !paymentResponse.link) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate payment link',
      });
    }

    // Create payment record with pending status (guest payment)
    const payment = new Payment({
      userId: null, // Guest payment - no user ID
      txRef: tx_ref,
      amount: amount,
      currency: 'NGN',
      status: 'pending',
      reference: tx_ref,
      customerEmail: email,
      customerName: name,
      customerPhone: phonenumber || '',
      flutterwaveResponse: paymentResponse,
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment generated successfully',
      data: {
        paymentId: payment._id,
        txRef: tx_ref,
        link: paymentResponse.link,
      },
    });
  } catch (error) {
    logger.error('Generate payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Generate payment for authenticated user
 * @route POST /api/payments/generate-user
 * @access Private
 */
const generateUserPayment = async (req, res) => {
  try {
    const { amount, email, name, phonenumber } = req.body;
    const userId = req.user._id; // Get user ID from JWT token

    // Validate required fields
    if (!amount || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Amount, email, and name are required',
      });
    }

    // Generate transaction reference
    const tx_ref = generateApplicationId();

    // Prepare payment data
    const paymentData = {
      tx_ref: tx_ref,
      amount: amount,
      email: email,
      phonenumber: phonenumber || '',
      name: name,
    };

    // Generate payment link
    const paymentResponse = await generatePayment(paymentData);

    logger.info(`Payment generated for user ${userId}: ${tx_ref}`);

    if (!paymentResponse || !paymentResponse.link) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate payment link',
      });
    }

    // Create payment record with user ID
    const payment = new Payment({
      userId: userId, // Authenticated user payment
      txRef: tx_ref,
      amount: amount,
      currency: 'NGN',
      status: 'pending',
      reference: tx_ref,
      customerEmail: email,
      customerName: name,
      customerPhone: phonenumber || '',
      flutterwaveResponse: paymentResponse,
    });

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payment generated successfully',
      data: {
        paymentId: payment._id,
        txRef: tx_ref,
        link: paymentResponse.link,
      },
    });
  } catch (error) {
    logger.error('Generate user payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Verify payment status by reference
 * @route GET /api/payments/verify
 * @access Public
 */
const verifyPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required',
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ reference: reference });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify payment with Flutterwave
    const verificationResponse = await verifyPayment(reference);

    logger.info(`Payment verification for ${reference}:`, verificationResponse);

    // Check if payment was successful
    if (
      verificationResponse.data &&
      verificationResponse.data.status === 'successful'
    ) {
      // Update payment record
      await payment.markAsSuccessful(verificationResponse.data);

      res.status(200).json({
        success: true,
        message: 'Payment verification successful',
        data: {
          paymentId: payment._id,
          status: payment.status,
          amount: payment.amount,
          reference: payment.reference,
          verification: verificationResponse.data,
        },
      });
    } else {
      // Mark payment as failed
      await payment.markAsFailed(verificationResponse);

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          paymentId: payment._id,
          status: payment.status,
          verification: verificationResponse,
        },
      });
    }
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all payments (Admin only)
 * @route GET /api/payments/all
 * @access Private (Admin only)
 */
const getAllPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { txRef: { $regex: search, $options: 'i' } },
      ];
    }

    // Get payments with pagination
    const payments = await Payment.find(query)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    logger.info(
      `Admin ${req.user.email} retrieved ${payments.length} payments`
    );

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user's payment details (requires authentication)
 * @route GET /api/payments/my
 * @access Private
 */
const getUserPaymentDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find user's payments
    const payments = await Payment.findByUser(userId);

    logger.info(`User ${req.user.email} retrieved ${payments.length} payments`);

    res.json({
      success: true,
      data: {
        payments,
        count: payments.length,
      },
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user payments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get payment statistics (Admin only)
 * @route GET /api/payments/stats
 * @access Private (Admin only)
 */
const getPaymentStatistics = async (req, res) => {
  try {
    const stats = await Payment.getStatistics();

    logger.info(`Admin ${req.user.email} retrieved payment statistics`);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get payment statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get payment by ID (Admin only)
 * @route GET /api/payments/:id
 * @access Private (Admin only)
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id).populate(
      'userId',
      'fullName email'
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    logger.info(`Admin ${req.user.email} retrieved payment ${id}`);

    res.json({
      success: true,
      data: {
        payment,
      },
    });
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update payment status (Admin only)
 * @route PATCH /api/payments/:id/status
 * @access Private (Admin only)
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'successful', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status',
      });
    }

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    payment.status = status;
    if (status === 'successful' && !payment.paidAt) {
      payment.paidAt = new Date();
    }
    await payment.save();

    logger.info(
      `Admin ${req.user.email} updated payment ${id} status to ${status}`
    );

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment,
      },
    });
  } catch (error) {
    logger.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  generateApplicantPayment,
  generateUserPayment,
  verifyPaymentStatus,
  getAllPayments,
  getUserPaymentDetails,
  getPaymentStatistics,
  getPaymentById,
  updatePaymentStatus,
};
