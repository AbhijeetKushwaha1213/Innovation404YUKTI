/**
 * Resolution Verification Controller
 * Handles AI-powered verification of issue resolutions
 */

const { extractEXIFMetadata } = require('../services/exifService');
const { calculateDistance } = require('../services/geoService');
const { compareImages } = require('../services/imageComparisonService');
const { verifyResolutionWithGemini } = require('../services/geminiVerificationService');
const { getReportById, updateReportStatus } = require('../services/databaseService');
const { saveResolutionUpload, checkDuplicateResolution } = require('../services/resolutionService');
const { uploadImageToStorage } = require('../services/storageService');

// Maximum allowed distance between before and after locations (in meters)
const MAX_LOCATION_DISTANCE = 100;

// Minimum confidence score to mark as verified
const MIN_CONFIDENCE_SCORE = 70;

/**
 * Verify resolution with AI-powered analysis
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyResolution = async (req, res) => {
  try {
    const { id: reportId } = req.params;
    const { lat, lng } = req.body;
    const worker_id = req.worker_id;
    const imageFile = req.file;

    console.log(`🔍 Starting resolution verification for report: ${reportId}`);
    console.log(`👷 Worker ID: ${worker_id}`);

    // ========================================
    // STEP 1: Validate Input
    // ========================================
    
    if (!imageFile) {
      return res.status(400).json({
        success: false,
        error: 'After image is required.'
      });
    }

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'GPS coordinates (lat, lng) are required.'
      });
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GPS coordinates.'
      });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'GPS coordinates out of valid range.'
      });
    }

    // ========================================
    // STEP 2: Get Original Report
    // ========================================
    
    console.log('📋 Fetching original report...');
    const report = await getReportById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.'
      });
    }

    if (report.status === 'resolved' || report.status === 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Report has already been resolved.'
      });
    }

    if (!report.image_url) {
      return res.status(400).json({
        success: false,
        error: 'Original report has no before image for comparison.'
      });
    }

    // ========================================
    // STEP 3: Check for Duplicate Resolution
    // ========================================
    
    console.log('🔄 Checking for duplicate resolution attempts...');
    const isDuplicate = await checkDuplicateResolution(reportId, worker_id);

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a resolution for this report.'
      });
    }

    // ========================================
    // STEP 4: Extract EXIF Metadata
    // ========================================
    
    console.log('📸 Extracting EXIF metadata...');
    const exifData = await extractEXIFMetadata(imageFile.buffer);
    
    let suspicionFlags = [];
    let exifLat = null;
    let exifLng = null;

    if (exifData.gps) {
      exifLat = exifData.gps.latitude;
      exifLng = exifData.gps.longitude;
      console.log(`📍 EXIF GPS: ${exifLat}, ${exifLng}`);
    } else {
      console.warn('⚠️  No GPS metadata in image');
      suspicionFlags.push('No GPS metadata in uploaded image');
    }

    // ========================================
    // STEP 5: Location Validation
    // ========================================
    
    console.log('🗺️  Validating location...');
    
    let locationDistance = null;
    let locationMatch = false;

    if (report.latitude && report.longitude) {
      locationDistance = calculateDistance(
        report.latitude,
        report.longitude,
        latitude,
        longitude
      );

      console.log(`📏 Distance from original location: ${locationDistance.toFixed(2)}m`);

      if (locationDistance > MAX_LOCATION_DISTANCE) {
        suspicionFlags.push(`Location mismatch: ${locationDistance.toFixed(0)}m away from original report`);
        console.warn(`⚠️  Location too far: ${locationDistance.toFixed(2)}m`);
      } else {
        locationMatch = true;
        console.log('✅ Location within acceptable range');
      }
    } else {
      console.warn('⚠️  Original report has no GPS coordinates');
      suspicionFlags.push('Original report has no GPS coordinates for comparison');
    }

    // ========================================
    // STEP 6: Upload After Image
    // ========================================
    
    console.log('☁️  Uploading after image...');
    const afterImageUrl = await uploadImageToStorage(imageFile, worker_id, 'resolution');

    if (!afterImageUrl) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload after image.'
      });
    }

    // ========================================
    // STEP 7: Image Similarity Analysis
    // ========================================
    
    console.log('🖼️  Analyzing image similarity...');
    const imageComparison = await compareImages(
      report.image_url,
      afterImageUrl
    );

    console.log(`📊 Image similarity: ${imageComparison.similarity}%`);
    console.log(`🔍 Perceptual hash difference: ${imageComparison.hashDifference}`);

    // Check for suspicious patterns
    if (imageComparison.similarity > 95) {
      suspicionFlags.push('Images are nearly identical - possible duplicate or fake resolution');
      console.warn('⚠️  Images too similar - possible fake');
    }

    if (imageComparison.similarity < 10) {
      suspicionFlags.push('Images appear completely unrelated - possible wrong location');
      console.warn('⚠️  Images too different - possible wrong location');
    }

    // ========================================
    // STEP 8: AI Vision Verification
    // ========================================
    
    console.log('🤖 Starting Gemini AI verification...');
    const aiVerification = await verifyResolutionWithGemini(
      report.image_url,
      afterImageUrl,
      report.issue_type || 'Unknown'
    );

    console.log('✅ AI verification complete:', aiVerification);

    // Add AI suspicions to flags
    if (aiVerification.suspicious && aiVerification.suspicion_reason) {
      suspicionFlags.push(aiVerification.suspicion_reason);
    }

    // ========================================
    // STEP 9: Decision Logic
    // ========================================
    
    console.log('⚖️  Making verification decision...');

    const isSuspicious = 
      suspicionFlags.length > 0 ||
      !locationMatch ||
      !aiVerification.same_location ||
      !aiVerification.issue_resolved ||
      aiVerification.suspicious ||
      aiVerification.resolution_confidence < MIN_CONFIDENCE_SCORE;

    let verificationStatus;
    let reportStatus;

    if (isSuspicious) {
      verificationStatus = 'suspicious';
      reportStatus = 'suspicious';
      console.log('🚨 Marked as SUSPICIOUS');
    } else {
      verificationStatus = 'verified';
      reportStatus = 'verified';
      console.log('✅ Marked as VERIFIED');
    }

    const suspicionReason = suspicionFlags.length > 0 
      ? suspicionFlags.join('; ') 
      : null;

    // ========================================
    // STEP 10: Save Results
    // ========================================
    
    console.log('💾 Saving verification results...');

    // Save resolution upload record
    const resolutionUpload = await saveResolutionUpload({
      report_id: reportId,
      worker_id: worker_id,
      after_image_url: afterImageUrl,
      after_lat: latitude,
      after_lng: longitude,
      exif_lat: exifLat,
      exif_lng: exifLng,
      ai_verification_status: verificationStatus,
      ai_confidence_score: aiVerification.resolution_confidence,
      suspicion_reason: suspicionReason,
      location_distance: locationDistance,
      image_similarity: imageComparison.similarity,
      same_location: aiVerification.same_location,
      issue_resolved: aiVerification.issue_resolved,
      visual_similarity_score: aiVerification.visual_similarity_score,
      analysis_summary: aiVerification.analysis_summary
    });

    // Update report status
    await updateReportStatus(reportId, reportStatus);

    console.log('✅ Verification complete!');

    // ========================================
    // STEP 11: Return Response
    // ========================================
    
    return res.status(201).json({
      success: true,
      message: isSuspicious 
        ? 'Resolution submitted but marked as suspicious for review.'
        : 'Resolution verified successfully!',
      data: {
        resolution_id: resolutionUpload.id,
        report_id: reportId,
        verification_status: verificationStatus,
        report_status: reportStatus,
        is_suspicious: isSuspicious,
        verification: {
          location_match: locationMatch,
          location_distance: locationDistance ? `${locationDistance.toFixed(2)}m` : null,
          image_similarity: `${imageComparison.similarity}%`,
          ai_confidence: aiVerification.resolution_confidence,
          same_location: aiVerification.same_location,
          issue_resolved: aiVerification.issue_resolved,
          visual_similarity: aiVerification.visual_similarity_score,
          analysis_summary: aiVerification.analysis_summary
        },
        suspicion_flags: suspicionFlags.length > 0 ? suspicionFlags : null,
        exif_metadata: {
          has_gps: !!exifData.gps,
          camera: exifData.camera,
          timestamp: exifData.timestamp
        },
        created_at: resolutionUpload.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error in verifyResolution controller:', error);

    // Handle specific error types
    if (error.message.includes('Gemini')) {
      return res.status(503).json({
        success: false,
        error: 'AI verification service temporarily unavailable.'
      });
    }

    if (error.message.includes('Database')) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save verification results.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during verification.'
    });
  }
};

module.exports = {
  verifyResolution
};
