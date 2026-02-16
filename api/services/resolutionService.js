/**
 * Resolution Service
 * Handles resolution upload database operations
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Save resolution upload to database
 * 
 * @param {Object} resolutionData - Resolution data
 * @returns {Object} Saved resolution object
 */
const saveResolutionUpload = async (resolutionData) => {
  try {
    console.log('💾 Saving resolution upload...');

    const {
      report_id,
      worker_id,
      after_image_url,
      after_lat,
      after_lng,
      exif_lat,
      exif_lng,
      ai_verification_status,
      ai_confidence_score,
      suspicion_reason,
      location_distance,
      image_similarity,
      same_location,
      issue_resolved,
      visual_similarity_score,
      analysis_summary
    } = resolutionData;

    const { data, error } = await supabase
      .from('resolution_uploads')
      .insert([
        {
          report_id,
          worker_id,
          after_image_url,
          after_lat,
          after_lng,
          exif_lat,
          exif_lng,
          ai_verification_status,
          ai_confidence_score,
          suspicion_reason,
          location_distance,
          image_similarity,
          same_location,
          issue_resolved,
          visual_similarity_score,
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
    console.error('❌ Error in saveResolutionUpload:', error);
    throw error;
  }
};

/**
 * Check if worker has already submitted resolution for this report
 * 
 * @param {string} reportId - Report UUID
 * @param {string} workerId - Worker UUID
 * @returns {boolean} True if duplicate exists
 */
const checkDuplicateResolution = async (reportId, workerId) => {
  try {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('id')
      .eq('report_id', reportId)
      .eq('worker_id', workerId)
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return false; // Allow submission on error
    }

    return data && data.length > 0;

  } catch (error) {
    console.error('❌ Error checking duplicate resolution:', error);
    return false;
  }
};

/**
 * Get resolution uploads for a report
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
 * Get resolution upload by ID
 * 
 * @param {string} resolutionId - Resolution UUID
 * @returns {Object} Resolution object
 */
const getResolutionById = async (resolutionId) => {
  try {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('*')
      .eq('id', resolutionId)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to fetch resolution - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getResolutionById:', error);
    throw error;
  }
};

/**
 * Update resolution verification status
 * 
 * @param {string} resolutionId - Resolution UUID
 * @param {string} status - New status
 * @param {string} reason - Reason for status change
 * @returns {Object} Updated resolution object
 */
const updateResolutionStatus = async (resolutionId, status, reason = null) => {
  try {
    const updates = {
      ai_verification_status: status
    };

    if (reason) {
      updates.suspicion_reason = reason;
    }

    const { data, error } = await supabase
      .from('resolution_uploads')
      .update(updates)
      .eq('id', resolutionId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to update resolution - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in updateResolutionStatus:', error);
    throw error;
  }
};

module.exports = {
  saveResolutionUpload,
  checkDuplicateResolution,
  getResolutionsByReportId,
  getResolutionById,
  updateResolutionStatus
};
