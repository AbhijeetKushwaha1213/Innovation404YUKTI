/**
 * Rate Limiting Middleware
 * Prevents abuse of verification endpoints
 */

const rateLimit = require('express-rate-limit');

/**
 * Strict rate limiter for resolution verification
 * 10 attempts per hour per IP
 */
const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    error: 'Too many verification attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Log suspicious activity
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip}`);
    console.warn(`   Email: ${req.body.worker_email || 'unknown'}`);
    console.warn(`   Report: ${req.params.id || 'unknown'}`);
    
    res.status(429).json({
      success: false,
      error: 'Too many verification attempts. Please try again in 1 hour.',
      retry_after: '1 hour'
    });
  }
});

/**
 * Standard rate limiter for general API
 * 100 requests per 15 minutes per IP
 */
const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  strictRateLimiter,
  standardRateLimiter
};
