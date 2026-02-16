/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user information
 */

const jwt = require('jsonwebtoken');

/**
 * Authenticate JWT token from Authorization header
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token.'
        });
      }

      // Extract user_id from token payload
      // Supabase JWT structure: { sub: user_id, ... }
      req.user_id = decoded.sub || decoded.user_id || decoded.id;
      
      if (!req.user_id) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token structure. User ID not found.'
        });
      }

      // Attach full decoded token to request for additional info if needed
      req.user = decoded;
      
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

/**
 * Authenticate worker JWT token
 * Validates that the user is a worker/official
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateWorker = (req, res, next) => {
  try {
    // First, authenticate the token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token.'
        });
      }

      // Extract user_id
      req.user_id = decoded.sub || decoded.user_id || decoded.id;
      req.worker_id = req.user_id; // Alias for clarity
      
      if (!req.user_id) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token structure. User ID not found.'
        });
      }

      // Check if user is a worker/official
      // This can be enhanced with role checking from database
      const userRole = decoded.role || decoded.user_metadata?.role;
      
      if (userRole && !['worker', 'official', 'admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Worker privileges required.'
        });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Worker authentication error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
};

module.exports = {
  authenticateToken,
  authenticateWorker
};
