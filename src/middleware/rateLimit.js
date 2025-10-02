const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Store for tracking requests (in production, use Redis)
const requestStore = new Map();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.resetTime > 0) {
      requestStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // 1 hour

// Custom store for rate limiting
const customStore = {
  incr: (key) => {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const max = 100; // max requests per window

    if (!requestStore.has(key)) {
      requestStore.set(key, {
        totalHits: 1,
        resetTime: now + windowMs,
      });
      return { totalHits: 1, resetTime: now + windowMs };
    }

    const data = requestStore.get(key);
    if (now > data.resetTime) {
      data.totalHits = 1;
      data.resetTime = now + windowMs;
    } else {
      data.totalHits += 1;
    }

    return { totalHits: data.totalHits, resetTime: data.resetTime };
  },

  decrement: (key) => {
    const data = requestStore.get(key);
    if (data && data.totalHits > 0) {
      data.totalHits -= 1;
    }
  },

  resetKey: (key) => {
    requestStore.delete(key);
  },
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many file uploads, please try again later.',
    });
  },
});

// Rate limiter for contact form submissions
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 submissions per hour
  message: {
    success: false,
    message: 'Too many contact form submissions, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Contact form rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many contact form submissions, please try again later.',
    });
  },
});

// Rate limiter for newsletter subscriptions
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 subscriptions per hour
  message: {
    success: false,
    message:
      'Too many newsletter subscription attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Newsletter rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message:
        'Too many newsletter subscription attempts, please try again later.',
    });
  },
});

// Rate limiter for search endpoints
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 searches per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: customStore,
  handler: (req, res) => {
    logger.warn(`Search rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many search requests, please try again later.',
    });
  },
});

// Custom rate limiter for specific endpoints
const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: customStore,
    handler: (req, res) => {
      logger.warn(`Custom rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

// Middleware to skip rate limiting for certain IPs (whitelist)
const skipRateLimit = (req, res, next) => {
  // Add your whitelisted IPs here
  const whitelistedIPs = [
    '127.0.0.1',
    '::1',
    // Add more IPs as needed
  ];

  if (whitelistedIPs.includes(req.ip)) {
    req.skipRateLimit = true;
  }

  next();
};

// Middleware to apply rate limiting conditionally
const conditionalRateLimit = (limiter) => {
  return (req, res, next) => {
    if (req.skipRateLimit) {
      return next();
    }
    return limiter(req, res, next);
  };
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  contactLimiter,
  newsletterLimiter,
  searchLimiter,
  createCustomLimiter,
  skipRateLimit,
  conditionalRateLimit,
};
