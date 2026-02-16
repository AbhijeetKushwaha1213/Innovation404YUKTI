/**
 * Resolution Verification Routes
 * Handles AI-powered verification of issue resolutions
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateWorker } = require('../middleware/authMiddleware');
const { verifyResolution } = require('../controllers/verificationController');

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
 * POST /api/report/:id/verify-resolution
 * Verify resolution with AI-powered analysis
 * 
 * @auth Required - Worker JWT token
 * @param id - Report UUID
 * @body image (file) - After image
 * @body lat (float) - GPS latitude
 * @body lng (float) - GPS longitude
 * @returns JSON response with verification results
 */
router.post(
  '/:id/verify-resolution',
  authenticateWorker,
  upload.single('image'),
  verifyResolution
);

module.exports = router;
