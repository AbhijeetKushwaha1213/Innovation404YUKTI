/**
 * STRICT Resolution Service
 * Database operations for strict verification system
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Save strict resolution upload to database
 * 
 * @param {Object} resolutionData - Resolution data
 * @returns {Object} Saved resolution object
 */
const saveStrictResolution = async (resolutionData) => {
  try {
    console.log('💾 Saving strict resolution upload...');

    const {
      report_id,
      worker_email,
      worker_id,
      after_image_url,
      live_lat,
      live_lng,
      exif_lat,
      exif_lng,
      exif_timestamp,
      exif_camera,
      distance_from_original,
      ai_same_location,
      ai_issue_resolved,
      ai_fake_detected,
      verification_status,
      suspicion_reason,
      suspicion_score,
      confidence_score,
      visual_consistency_score,
      image_similarity,
      analysis_summary
    } = resolutionData;

    const { data, error } = await supabase
      .from('resolution_uploads')
      .insert([
        {
          report_id,
          worker_email,
          worker_id,
          after_image_url,
          live_lat,
          live_lng,
          exif_lat,
          exif_lng,
          exif_timestamp,
          exif_camera,
          distance_from_original,
          ai_same_location,
          ai_issue_resolved,
          ai_fake_detected,
          ai_verification_status: verification_status,
          suspicion_reason,
          suspicion_score,
          ai_confidence_score: confidence_score,
          visual_consistency_score,
          image_similarity,
          analysis_summary,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to save resolution - ${error.message}`);
    }

    console.log('✅ Resolution saved:', data.id);
    return data;

  } catch (error) {
    console.error('❌ Error in saveStrictResolution:', error);
    throw error;
  }
};

/**
 * Check if worker has already submitted resolution for this report
 * 
 * @param {string} reportId - Report UUID
 * @param {string} workerEmail - Worker email
 * @returns {boolean} True if duplicate exists
 */
const checkDuplicateResolution = async (reportId, workerEmail) => {
  try {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('id')
      .eq('report_id', reportId)
      .eq('worker_email', workerEmail.toLowerCase())
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return false; // Allow submission on error (fail open for this check)
    }

    return data && data.length > 0;

  } catch (error) {
    console.error('❌ Error checking duplicate resolution:', error);
    return false;
  }
};

/**
 * Get all resolutions for a report
 * 
 * @param {string} reportId - Report UUID
 * @returns {Array} Array of resolution uploads
 */
const getResolutionsByReportId = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to fetch resolutions - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getResolutionsByReportId:', error);
    throw error;
  }
};

/**
 * Get suspicious resolutions for review
 * 
 * @param {number} limit - Number of records to fetch
 * @returns {Array} Array of suspicious resolutions
 */
const getSuspiciousResolutions = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('*, reports(title, issue_type)')
      .eq('ai_verification_status', 'suspicious')
      .order('suspicion_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to fetch suspicious resolutions - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getSuspiciousResolutions:', error);
    throw error;
  }
};

module.exports = {
  saveStrictResolution,
  checkDuplicateResolution,
  getResolutionsByReportId,
  getSuspiciousResolutions
};
