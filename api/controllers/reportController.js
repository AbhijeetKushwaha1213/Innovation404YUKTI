/**
 * Report Controller
 * Handles business logic for report analysis
 */

const { analyzeImageWithGemini } = require('../services/geminiService');
const { saveReport } = require('../services/databaseService');
const { uploadImageToStorage } = require('../services/storageService');

/**
 * Analyze report with Gemini Vision API
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeReport = async (req, res) => {
  try {
    const { title } = req.body;
    const user_id = req.user_id;
    const imageFile = req.file;

    // Validation: Check if image exists
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'Image file is required.'
      });
    }

    // Validation: Check title
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required.'
      });
    }

    // Validation: File size (already handled by multer, but double-check)
    if (imageFile.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Image size must be less than 5MB.'
      });
    }

    // Validation: File type (already handled by multer, but double-check)
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only JPEG and PNG are allowed.'
      });
    }

    console.log(`📸 Processing image analysis for user: ${user_id}`);
    console.log(`📝 Title: ${title}`);
    console.log(`🖼️  Image: ${imageFile.originalname} (${(imageFile.size / 1024).toFixed(2)} KB)`);

    // Step 1: Convert image to base64
    const imageBase64 = imageFile.buffer.toString('base64');

    // Step 2: Analyze image with Gemini Vision API
    console.log('🤖 Sending image to Gemini API...');
    const geminiAnalysis = await analyzeImageWithGemini(imageBase64, imageFile.mimetype);

    if (!geminiAnalysis) {
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze image. Please try again.'
      });
    }

    console.log('✅ Gemini analysis complete:', geminiAnalysis);

    // Step 3: Upload image to Supabase Storage
    console.log('☁️  Uploading image to storage...');
    const imageUrl = await uploadImageToStorage(imageFile, user_id);

    if (!imageUrl) {
      console.warn('⚠️  Image upload failed, proceeding without image URL');
    }

    // Step 4: Save report to database
    console.log('💾 Saving report to database...');
    const report = await saveReport({
      user_id,
      title: title.trim(),
      image_url: imageUrl,
      issue_type: geminiAnalysis.issue_type,
      description: geminiAnalysis.generated_description,
      confidence_score: geminiAnalysis.confidence_score,
      severity_level: geminiAnalysis.severity_level,
      priority_score: geminiAnalysis.priority_score,
      is_valid_issue: geminiAnalysis.is_valid_issue,
      recommended_authority: geminiAnalysis.recommended_authority
    });

    if (!report) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save report. Please try again.'
      });
    }

    console.log('✅ Report saved successfully:', report.id);

    // Step 5: Return success response
    return res.status(201).json({
      success: true,
      message: 'Report analyzed and saved successfully.',
      data: {
        report_id: report.id,
        title: report.title,
        image_url: report.image_url,
        analysis: {
          issue_type: report.issue_type,
          description: report.description,
          confidence_score: report.confidence_score,
          severity_level: report.severity_level,
          priority_score: report.priority_score,
          is_valid_issue: report.is_valid_issue,
          recommended_authority: report.recommended_authority
        },
        created_at: report.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error in analyzeReport controller:', error);

    // Handle specific error types
    if (error.message.includes('Gemini API')) {
      return res.status(503).json({
        success: false,
        error: 'AI analysis service temporarily unavailable. Please try again later.'
      });
    }

    if (error.message.includes('Database')) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save report. Please try again.'
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    });
  }
};

module.exports = {
  analyzeReport
};
