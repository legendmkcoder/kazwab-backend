const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const logger = require('../utils/logger');

/**
 * Simple authentication middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.user.hasPermission(requiredRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Convenience middleware for common roles
const requireAdmin = requireRole('admin');
const requireNewsEditor = requireRole('news_editor');
const requireContentManager = requireRole('content_manager');

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireNewsEditor,
  requireContentManager,
};
