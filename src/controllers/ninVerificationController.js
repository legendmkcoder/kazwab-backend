const User = require('../models/UserModel');
const NINVerification = require('../models/ninVerificationModel');
const idcheckClient = require('../services/idcheckClient');
const logger = require('../utils/logger');

/**
 * Verify NIN
 * @route POST /api/nin-verification/verify
 * @access Public
 */
exports.verifyNIN = async (req, res) => {
  try {
    const { nin } = req.body;

    if (!nin) {
      return res.status(400).json({
        success: false,
        message: 'NIN is required',
      });
    }

    // Verify NIN with IDCheck API
    const verificationResult = await idcheckClient.verifyNIN(nin);

    // Check if NIN is already registered with another user (if user system uses NIN)
    // Note: The User model doesn't have a nin field yet, so this is optional
    // Uncomment this if you add nin field to User model
    /*
    const existingUser = await User.findOne({ nin });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This NIN is already registered with another account",
      });
    }
    */

    res.json({
      status: 'success',
      message: 'NIN verified successfully',
      data: {
        nin: verificationResult.data.nin,
        firstName: verificationResult.data.firstName,
        lastName: verificationResult.data.lastName,
        middleName: verificationResult.data.middleName,
        dateOfBirth: verificationResult.data.dateOfBirth,
        gender: verificationResult.data.gender,
        phoneNumber: verificationResult.data.phoneNumber,
        email: verificationResult.data.email,
        address: verificationResult.data.address,
        residenceAddressLine1: verificationResult.data.residenceAddressLine1,
        residenceAddressLine2: verificationResult.data.residenceAddressLine2,
        residenceTown: verificationResult.data.residenceTown,
        residenceLga: verificationResult.data.residenceLga,
        residenceState: verificationResult.data.residenceState,
        residencePostalCode: verificationResult.data.residencePostalCode,
        state: verificationResult.data.state,
        lga: verificationResult.data.lga,
        photo: verificationResult.data.photo,
        verificationId: verificationResult.data.verificationId,
        fromCache: verificationResult.fromCache,
      },
    });
  } catch (error) {
    logger.error('NIN verification error:', error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'NIN verification failed';

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Get NIN verification by NIN
 * @route GET /api/nin-verification/:nin
 * @access Private (Admin only)
 */
exports.getNINVerification = async (req, res) => {
  try {
    const { nin } = req.params;

    const ninVerification = await NINVerification.findOne({ nin });

    if (!ninVerification) {
      return res.status(404).json({
        success: false,
        message: 'NIN verification not found',
      });
    }

    res.json({
      success: true,
      data: ninVerification,
    });
  } catch (error) {
    logger.error('Get NIN verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve NIN verification',
    });
  }
};

/**
 * Get all NIN verifications (with pagination)
 * @route GET /api/nin-verification
 * @access Private (Admin only)
 */
exports.getAllNINVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (search) {
      query = {
        $or: [
          { nin: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const [verifications, total] = await Promise.all([
      NINVerification.find(query)
        .sort({ verifiedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      NINVerification.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        verifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    logger.error('Get all NIN verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve NIN verifications',
    });
  }
};

/**
 * Clear NIN cache
 * @route DELETE /api/nin-verification/cache/:nin
 * @access Private (Admin only)
 */
exports.clearNINCache = async (req, res) => {
  try {
    const { nin } = req.params;

    const deleted = await idcheckClient.clearNINCache(nin);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'NIN not found in cache',
      });
    }

    res.json({
      success: true,
      message: 'NIN cache cleared successfully',
    });
  } catch (error) {
    logger.error('Clear NIN cache error:', error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to clear NIN cache';

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

/**
 * Get cache statistics
 * @route GET /api/nin-verification/cache/stats
 * @access Private (Admin only)
 */
exports.getCacheStats = async (req, res) => {
  try {
    const stats = await idcheckClient.getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get cache stats error:', error);

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Failed to get cache statistics';

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};
