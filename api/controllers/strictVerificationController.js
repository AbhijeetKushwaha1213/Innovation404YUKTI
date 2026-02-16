/**
 * STRICT Resolution Verification Controller
 * Enhanced security with 20m GPS tolerance and comprehensive fraud detection
 */

const { extractEXIFMetadata } = require('../services/exifService');
const { calculateDistance } = require('../services/geoService');
const { compareImages } = require('../services/imageComparisonService');
const { strictVerifyWithGemini } = require('../services/strictGeminiService');
const { verifyWorkerEmail } = require('../services/workerAuthService');
const { getReportById, updateReportStatus } = require('../services/databaseService');
const { saveStrictResolution, checkDuplicateResolution } = require('../services/strictResolutionService');
const { uploadImageToStorage } = require('../services/storageService');
const { logSuspiciousAttempt } = require('../services/securityLogService');

// STRICT: Maximum allowed distance (20 meters)
const MAX_LOCATION_DISTANCE = 20;

// STRICT: Minimum confidence score (80%)
const MIN_CONFIDENCE_SCORE = 80;

// STRICT: Maximum EXIF GPS deviation (10 meters)
const MAX_EXIF_DEVIATION = 10;

/**
 * STRICT resolution verification with comprehensive fraud detection
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const strictVerifyResolution = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id: reportId } = req.params;
    const { worker_email, live_lat, live_lng } = req.body;
    const imageFile = req.file;

    console.log('🔒 ========================================');
    console.log('🔒 STRICT VERIFICATION STARTED');
    console.log('🔒 ========================================');
    console.log(`📋 Report ID: ${reportId}`);
    console.log(`👷 Worker Email: ${worker_email}`);
    console.log(`📍 Live GPS: ${live_lat}, ${live_lng}`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);

    // ========================================
    // VALIDATION: Input
    // ========================================
    
    if (!imageFile) {
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email: worker_email || 'unknown',
        reason: 'Missing image file',
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'After image is required.'
      });
    }

    if (!worker_email || !worker_email.includes('@')) {
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email: worker_email || 'unknown',
        reason: 'Invalid email format',
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Valid worker email is required.'
      });
    }

    if (!live_lat || !live_lng) {
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email,
        reason: 'Missing GPS coordinates',
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Live GPS coordinates (live_lat, live_lng) are required.'
      });
    }

    // Validate coordinates
    const latitude = parseFloat(live_lat);
    const longitude = parseFloat(live_lng);

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
    // STEP 1: Email Authentication (STRICT)
    // ========================================
    
    console.log('🔐 STEP 1: Verifying worker email...');
    const workerAuth = await verifyWorkerEmail(worker_email);

    if (!workerAuth.authorized) {
      console.error('❌ UNAUTHORIZED: Worker email not authorized');
      
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email,
        reason: 'Unauthorized worker email',
        ip: req.ip,
        severity: 'high'
      });
      
      return res.status(403).json({
        success: false,
        error: 'Unauthorized. Worker email not found in authorized workers list.',
        verification_status: 'rejected'
      });
    }

    console.log(`✅ Worker authorized: ${workerAuth.worker_name}`);

    // ========================================
    // STEP 2: Get Original Report
    // ========================================
    
    console.log('📋 STEP 2: Fetching original report...');
    const report = await getReportById(reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found.'
      });
    }

    if (report.status === 'verified') {
      return res.status(400).json({
        success: false,
        error: 'Report has already been verified.'
      });
    }

    if (!report.image_url) {
      return res.status(400).json({
        success: false,
        error: 'Original report has no before image for comparison.'
      });
    }

    if (!report.latitude || !report.longitude) {
      return res.status(400).json({
        success: false,
        error: 'Original report has no GPS coordinates for verification.'
      });
    }

    // ========================================
    // STEP 3: Check Duplicate Submission
    // ========================================
    
    console.log('🔄 STEP 3: Checking for duplicate submissions...');
    const isDuplicate = await checkDuplicateResolution(reportId, worker_email);

    if (isDuplicate) {
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email,
        reason: 'Duplicate submission attempt',
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a resolution for this report.'
      });
    }

    // Initialize suspicion tracking
    let suspicionFlags = [];
    let suspicionScore = 0; // 0-100, higher = more suspicious

    // ========================================
    // STEP 4: Live GPS Validation (STRICT 20m)
    // ========================================
    
    console.log('📍 STEP 4: Validating live GPS location (STRICT 20m)...');
    
    const locationDistance = calculateDistance(
      report.latitude,
      report.longitude,
      latitude,
      longitude
    );

    console.log(`📏 Distance from original: ${locationDistance.toFixed(2)}m`);

    let locationMatch = false;

    if (locationDistance > MAX_LOCATION_DISTANCE) {
      suspicionFlags.push(`Worker not at issue location: ${locationDistance.toFixed(1)}m away (max 20m)`);
      suspicionScore += 40; // Major suspicion
      console.error(`❌ LOCATION FAIL: ${locationDistance.toFixed(2)}m > ${MAX_LOCATION_DISTANCE}m`);
    } else {
      locationMatch = true;
      console.log(`✅ Location verified: ${locationDistance.toFixed(2)}m within ${MAX_LOCATION_DISTANCE}m`);
    }

    // ========================================
    // STEP 5: EXIF Metadata Extraction
    // ========================================
    
    console.log('📸 STEP 5: Extracting EXIF metadata...');
    const exifData = await extractEXIFMetadata(imageFile.buffer);
    
    let exifLat = null;
    let exifLng = null;
    let exifTimestamp = null;
    let exifCamera = null;

    if (exifData.gps) {
      exifLat = exifData.gps.latitude;
      exifLng = exifData.gps.longitude;
      console.log(`📍 EXIF GPS: ${exifLat}, ${exifLng}`);
      
      // STRICT: Compare EXIF GPS with live GPS
      const exifDeviation = calculateDistance(latitude, longitude, exifLat, exifLng);
      console.log(`📏 EXIF deviation: ${exifDeviation.toFixed(2)}m`);
      
      if (exifDeviation > MAX_EXIF_DEVIATION) {
        suspicionFlags.push(`EXIF GPS differs from live GPS by ${exifDeviation.toFixed(1)}m`);
        suspicionScore += 30;
        console.warn(`⚠️  EXIF GPS mismatch: ${exifDeviation.toFixed(2)}m deviation`);
      }
    } else {
      suspicionFlags.push('No GPS metadata in uploaded image');
      suspicionScore += 20;
      console.warn('⚠️  No GPS metadata in image');
    }

    if (exifData.timestamp) {
      exifTimestamp = exifData.timestamp;
      console.log(`🕐 EXIF timestamp: ${exifTimestamp}`);
      
      // Check if timestamp is recent (within last 24 hours)
      const now = new Date();
      const exifDate = new Date(exifTimestamp.replace(/:/g, '-').replace(' ', 'T'));
      const hoursDiff = (now - exifDate) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        suspicionFlags.push(`Image timestamp is ${Math.round(hoursDiff)} hours old`);
        suspicionScore += 15;
        console.warn(`⚠️  Old image: ${Math.round(hoursDiff)} hours old`);
      }
    } else {
      suspicionFlags.push('No timestamp in image metadata');
      suspicionScore += 10;
    }

    if (exifData.camera) {
      exifCamera = `${exifData.camera.make || ''} ${exifData.camera.model || ''}`.trim();
      console.log(`📷 Camera: ${exifCamera}`);
    }

    // ========================================
    // STEP 6: Upload After Image
    // ========================================
    
    console.log('☁️  STEP 6: Uploading after image...');
    const afterImageUrl = await uploadImageToStorage(imageFile, workerAuth.worker_id, 'resolution');

    if (!afterImageUrl) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload after image.'
      });
    }

    // ========================================
    // STEP 7: Perceptual Hash Comparison
    // ========================================
    
    console.log('🖼️  STEP 7: Analyzing image similarity (pHash)...');
    const imageComparison = await compareImages(
      report.image_url,
      afterImageUrl
    );

    console.log(`📊 Image similarity: ${imageComparison.similarity}%`);
    console.log(`🔍 Hash difference: ${imageComparison.hashDifference}`);

    // STRICT: Check for suspicious patterns
    if (imageComparison.similarity > 95) {
      suspicionFlags.push('Images are nearly identical - possible fake resolution or reused image');
      suspicionScore += 50; // Critical suspicion
      console.error('❌ FAKE DETECTED: Images too similar');
    }

    if (imageComparison.similarity < 5) {
      suspicionFlags.push('Images appear completely unrelated - possible wrong location or staged photo');
      suspicionScore += 40;
      console.error('❌ MISMATCH: Images completely unrelated');
    }

    // ========================================
    // STEP 8: STRICT Gemini AI Verification
    // ========================================
    
    console.log('🤖 STEP 8: Starting STRICT Gemini AI verification...');
    const aiVerification = await strictVerifyWithGemini(
      report.image_url,
      afterImageUrl,
      report.issue_type || 'Unknown'
    );

    console.log('✅ AI verification complete');
    console.log(`   Same location: ${aiVerification.same_location}`);
    console.log(`   Issue resolved: ${aiVerification.issue_resolved}`);
    console.log(`   Fake detected: ${aiVerification.fake_detected}`);
    console.log(`   Confidence: ${aiVerification.resolution_confidence}%`);

    // Add AI suspicions
    if (aiVerification.suspicious) {
      suspicionFlags.push(aiVerification.suspicion_reason);
      suspicionScore += 30;
    }

    if (aiVerification.fake_detected) {
      suspicionFlags.push('AI detected possible fake, manipulated, or AI-generated image');
      suspicionScore += 50; // Critical
      console.error('❌ FAKE DETECTED by AI');
    }

    if (!aiVerification.same_location) {
      suspicionFlags.push('AI determined images are from different locations');
      suspicionScore += 35;
    }

    if (!aiVerification.issue_resolved) {
      suspicionFlags.push('AI determined issue is not resolved');
      suspicionScore += 30;
    }

    // ========================================
    // STEP 9: STRICT Decision Logic
    // ========================================
    
    console.log('⚖️  STEP 9: Making STRICT verification decision...');
    console.log(`   Suspicion score: ${suspicionScore}/100`);
    console.log(`   Suspicion flags: ${suspicionFlags.length}`);

    // STRICT: ALL conditions must pass
    const allChecksPassed = 
      locationMatch &&
      locationDistance <= MAX_LOCATION_DISTANCE &&
      aiVerification.same_location &&
      aiVerification.issue_resolved &&
      !aiVerification.fake_detected &&
      !aiVerification.suspicious &&
      aiVerification.resolution_confidence >= MIN_CONFIDENCE_SCORE &&
      suspicionScore < 30; // Allow minor suspicions only

    let verificationStatus;
    let reportStatus;

    if (allChecksPassed) {
      verificationStatus = 'verified';
      reportStatus = 'verified';
      console.log('✅ ========================================');
      console.log('✅ VERIFICATION PASSED - ALL CHECKS PASSED');
      console.log('✅ ========================================');
    } else {
      verificationStatus = 'suspicious';
      reportStatus = 'suspicious';
      console.log('🚨 ========================================');
      console.log('🚨 VERIFICATION FAILED - MARKED SUSPICIOUS');
      console.log('🚨 ========================================');
      
      // Log suspicious attempt
      await logSuspiciousAttempt({
        report_id: reportId,
        worker_email,
        reason: suspicionFlags.join('; '),
        suspicion_score: suspicionScore,
        ip: req.ip,
        severity: suspicionScore > 70 ? 'critical' : suspicionScore > 40 ? 'high' : 'medium'
      });
    }

    const suspicionReason = suspicionFlags.length > 0 
      ? suspicionFlags.join('; ') 
      : null;

    // ========================================
    // STEP 10: Save Results
    // ========================================
    
    console.log('💾 STEP 10: Saving verification results...');

    const resolution = await saveStrictResolution({
      report_id: reportId,
      worker_email,
      worker_id: workerAuth.worker_id,
      after_image_url: afterImageUrl,
      live_lat: latitude,
      live_lng: longitude,
      exif_lat: exifLat,
      exif_lng: exifLng,
      exif_timestamp: exifTimestamp,
      exif_camera: exifCamera,
      distance_from_original: locationDistance,
      ai_same_location: aiVerification.same_location,
      ai_issue_resolved: aiVerification.issue_resolved,
      ai_fake_detected: aiVerification.fake_detected,
      verification_status: verificationStatus,
      suspicion_reason: suspicionReason,
      suspicion_score: suspicionScore,
      confidence_score: aiVerification.resolution_confidence,
      visual_consistency_score: aiVerification.visual_consistency_score,
      image_similarity: imageComparison.similarity,
      analysis_summary: aiVerification.analysis_summary
    });

    // Update report status
    await updateReportStatus(reportId, reportStatus);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️  Processing time: ${processingTime}ms`);
    console.log('✅ Verification complete!');

    // ========================================
    // STEP 11: Return Response
    // ========================================
    
    return res.status(201).json({
      success: true,
      message: allChecksPassed 
        ? 'Resolution verified successfully! All security checks passed.'
        : 'Resolution submitted but marked as SUSPICIOUS. Manual review required.',
      data: {
        resolution_id: resolution.id,
        report_id: reportId,
        verification_status: verificationStatus,
        report_status: reportStatus,
        all_checks_passed: allChecksPassed,
        suspicion_score: suspicionScore,
        verification: {
          location_check: {
            passed: locationMatch,
            distance: `${locationDistance.toFixed(2)}m`,
            max_allowed: `${MAX_LOCATION_DISTANCE}m`
          },
          exif_check: {
            has_gps: !!exifData.gps,
            has_timestamp: !!exifData.timestamp,
            camera: exifCamera,
            gps_deviation: exifLat && exifLng ? 
              `${calculateDistance(latitude, longitude, exifLat, exifLng).toFixed(2)}m` : null
          },
          image_analysis: {
            similarity: `${imageComparison.similarity}%`,
            hash_difference: imageComparison.hashDifference
          },
          ai_verification: {
            same_location: aiVerification.same_location,
            issue_resolved: aiVerification.issue_resolved,
            fake_detected: aiVerification.fake_detected,
            confidence: aiVerification.resolution_confidence,
            visual_consistency: aiVerification.visual_consistency_score,
            analysis: aiVerification.analysis_summary
          }
        },
        suspicion_flags: suspicionFlags.length > 0 ? suspicionFlags : null,
        processing_time_ms: processingTime,
        created_at: resolution.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error in strictVerifyResolution:', error);

    // Log error
    await logSuspiciousAttempt({
      report_id: req.params.id,
      worker_email: req.body.worker_email || 'unknown',
      reason: `System error: ${error.message}`,
      ip: req.ip,
      severity: 'error'
    });

    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during verification.'
    });
  }
};

module.exports = {
  strictVerifyResolution
};
