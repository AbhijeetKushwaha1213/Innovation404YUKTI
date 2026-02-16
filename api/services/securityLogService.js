/**
 * Security Logging Service
 * Logs suspicious attempts and security events
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Log suspicious attempt
 * 
 * @param {Object} attemptData - Attempt data
 * @returns {Object} Logged attempt object
 */
const logSuspiciousAttempt = async (attemptData) => {
  try {
    const {
      report_id,
      worker_email,
      reason,
      suspicion_score = 0,
      ip,
      severity = 'medium'
    } = attemptData;

    console.log(`🚨 Logging suspicious attempt: ${reason}`);

    const { data, error} = await supabase
      .from('security_logs')
      .insert([
        {
          report_id,
          worker_email: worker_email.toLowerCase(),
          reason,
          suspicion_score,
          ip_address: ip,
          severity,
          event_type: 'suspicious_resolution_attempt',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to log suspicious attempt:', error);
      // Don't throw - logging failure shouldn't break the flow
      return null;
    }

    return data;

  } catch (error) {
    console.error('❌ Error in logSuspiciousAttempt:', error);
    // Don't throw - logging failure shouldn't break the flow
    return null;
  }
};

/**
 * Get security logs for a worker
 * 
 * @param {string} workerEmail - Worker email
 * @param {number} limit - Number of records
 * @returns {Array} Array of security logs
 */
const getSecurityLogsByWorker = async (workerEmail, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .eq('worker_email', workerEmail.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error:', error);
      return [];
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getSecurityLogsByWorker:', error);
    return [];
  }
};

/**
 * Get recent suspicious attempts
 * 
 * @param {number} hours - Hours to look back
 * @param {number} limit - Number of records
 * @returns {Array} Array of security logs
 */
const getRecentSuspiciousAttempts = async (hours = 24, limit = 100) => {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('suspicion_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Database error:', error);
      return [];
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getRecentSuspiciousAttempts:', error);
    return [];
  }
};

/**
 * Check if worker has too many suspicious attempts
 * 
 * @param {string} workerEmail - Worker email
 * @param {number} hours - Hours to look back
 * @param {number} threshold - Max allowed attempts
 * @returns {boolean} True if threshold exceeded
 */
const hasExcessiveSuspiciousAttempts = async (workerEmail, hours = 24, threshold = 5) => {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await supabase
      .from('security_logs')
      .select('id')
      .eq('worker_email', workerEmail.toLowerCase())
      .gte('created_at', since.toISOString())
      .gte('suspicion_score', 30); // Only count significant suspicions

    if (error) {
      console.error('❌ Database error:', error);
      return false;
    }

    return data && data.length >= threshold;

  } catch (error) {
    console.error('❌ Error in hasExcessiveSuspiciousAttempts:', error);
    return false;
  }
};

module.exports = {
  logSuspiciousAttempt,
  getSecurityLogsByWorker,
  getRecentSuspiciousAttempts,
  hasExcessiveSuspiciousAttempts
};
