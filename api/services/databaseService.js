/**
 * Database Service
 * Handles all database operations using Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for server-side operations
);

/**
 * Save report to database
 * 
 * @param {Object} reportData - Report data to save
 * @returns {Object} Saved report object
 */
const saveReport = async (reportData) => {
  try {
    console.log('💾 Saving report to database...');

    const {
      user_id,
      title,
      image_url,
      issue_type,
      description,
      confidence_score,
      severity_level,
      priority_score,
      is_valid_issue,
      recommended_authority
    } = reportData;

    // Insert report into database
    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          user_id,
          title,
          image_url,
          issue_type,
          description,
          confidence_score,
          severity_level,
          priority_score,
          is_valid_issue,
          recommended_authority,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to save report - ${error.message}`);
    }

    console.log('✅ Report saved successfully:', data.id);
    return data;

  } catch (error) {
    console.error('❌ Error in saveReport:', error);
    throw error;
  }
};

/**
 * Get report by ID
 * 
 * @param {string} reportId - Report UUID
 * @returns {Object} Report object
 */
const getReportById = async (reportId) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to fetch report - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getReportById:', error);
    throw error;
  }
};

/**
 * Get reports by user ID
 * 
 * @param {string} userId - User UUID
 * @param {number} limit - Number of reports to fetch
 * @returns {Array} Array of report objects
 */
const getReportsByUserId = async (userId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to fetch reports - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getReportsByUserId:', error);
    throw error;
  }
};

/**
 * Update report status
 * 
 * @param {string} reportId - Report UUID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated report object
 */
const updateReport = async (reportId, updates) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to update report - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in updateReport:', error);
    throw error;
  }
};

/**
 * Update report status
 * 
 * @param {string} reportId - Report UUID
 * @param {string} status - New status
 * @returns {Object} Updated report object
 */
const updateReportStatus = async (reportId, status) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ status: status })
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database: Failed to update report - ${error.message}`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error in updateReportStatus:', error);
    throw error;
  }
};

module.exports = {
  saveReport,
  getReportById,
  getReportsByUserId,
  updateReport,
  updateReportStatus
};
