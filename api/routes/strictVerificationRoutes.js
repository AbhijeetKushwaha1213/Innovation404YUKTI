/**
 * STRICT Resolution Verification Routes
 * Enhanced security with 20m GPS tolerance and fake detection
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { strictVerifyResolution } = require('../controllers/strictVerificationController');
const { strictRateLimiter } = require('../middleware/rateLimitMiddleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only jpeg and png
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
    }
  }
});

/**
 * POST /api/report/:id/submit-resolution
 * STRICT verification with email auth and 20m GPS tolerance
 * 
 * @param id - Report UUID
 * @body image (file) - After image
 * @body worker_email (string) - Worker email
 * @body live_lat (float) - Live GPS latitude
 * @body live_lng (float) - Live GPS longitude
 * @returns JSON response with strict verification results
 */
router.post(
  '/:id/submit-resolution',
  strictRateLimiter, // Strict rate limiting
  upload.single('image'),
  strictVerifyResolution
);

module.exports = router;
