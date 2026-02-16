/**
 * Worker Authentication Service
 * Verifies worker email against authorized workers database
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Verify worker email is authorized
 * 
 * @param {string} email - Worker email
 * @returns {Object} Authorization result
 */
const verifyWorkerEmail = async (email) => {
  try {
    console.log(`🔐 Verifying worker email: ${email}`);

    // Check in authorized_workers table
    const { data, error } = await supabase
      .from('authorized_workers')
      .select('id, email, name, role, status')
      .eq('email', email.toLowerCase())
      .eq('status', 'active')
      .single();

    if (error || !data) {
      console.error('❌ Worker not found or inactive');
      return {
        authorized: false,
        worker_id: null,
        worker_name: null,
        worker_role: null
      };
    }

    console.log(`✅ Worker authorized: ${data.name} (${data.role})`);

    return {
      authorized: true,
      worker_id: data.id,
      worker_name: data.name,
      worker_role: data.role
    };

  } catch (error) {
    console.error('❌ Error verifying worker email:', error);
    
    // Fail closed - deny access on error
    return {
      authorized: false,
      worker_id: null,
      worker_name: null,
      worker_role: null,
      error: error.message
    };
  }
};

/**
 * Get worker by ID
 * 
 * @param {string} workerId - Worker UUID
 * @returns {Object} Worker object
 */
const getWorkerById = async (workerId) => {
  try {
    const { data, error } = await supabase
      .from('authorized_workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('❌ Error in getWorkerById:', error);
    return null;
  }
};

/**
 * Check if worker is authorized for specific report
 * (Can be extended with territory/department checks)
 * 
 * @param {string} workerId - Worker UUID
 * @param {string} reportId - Report UUID
 * @returns {boolean} True if authorized
 */
const isWorkerAuthorizedForReport = async (workerId, reportId) => {
  try {
    // For now, all active workers can handle any report
    // This can be extended with territory/department logic
    
    const worker = await getWorkerById(workerId);
    return worker && worker.status === 'active';

  } catch (error) {
    console.error('❌ Error checking worker authorization:', error);
    return false;
  }
};

module.exports = {
  verifyWorkerEmail,
  getWorkerById,
  isWorkerAuthorizedForReport
};
