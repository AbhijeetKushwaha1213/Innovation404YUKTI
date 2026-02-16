/**
 * Report Routes
 * Handles all report-related API endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');
const { analyzeReport } = require('../controllers/reportController');

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
 * POST /api/report/analyze
 * Analyze uploaded image using Gemini Vision API
 * 
 * @auth Required - JWT token in Authorization header
 * @body title (string) - Issue title
 * @body image (file) - Image file (jpeg/png, max 5MB)
 * @returns JSON response with analysis results
 */
router.post(
  '/analyze',
  authenticateToken,
  upload.single('image'),
  analyzeReport
);

module.exports = router;
