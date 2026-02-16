/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STORAGE_BUCKET = 'report-images';

/**
 * Upload image to Supabase Storage
 * 
 * @param {Object} file - Multer file object
 * @param {string} userId - User UUID
 * @param {string} folder - Folder name (optional)
 * @returns {string} Public URL of uploaded image
 */
const uploadImageToStorage = async (file, userId, folder = 'reports') => {
  try {
    console.log(`☁️  Uploading image to Supabase Storage (${folder})...`);

    // Generate unique filename
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExt}`;
    const fullPath = folder === 'reports' ? fileName : `${folder}/${fileName}`;

    // Determine bucket based on folder
    const bucket = folder === 'resolution' ? 'resolution-images' : STORAGE_BUCKET;

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`Storage: Failed to upload image - ${error.message}`);
    }

    console.log('✅ Image uploaded successfully:', data.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;

  } catch (error) {
    console.error('❌ Error in uploadImageToStorage:', error);
    
    // Don't throw error - allow report to be saved without image
    return null;
  }
};

/**
 * Delete image from Supabase Storage
 * 
 * @param {string} imageUrl - Public URL of image to delete
 * @returns {boolean} Success status
 */
const deleteImageFromStorage = async (imageUrl) => {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split(`${STORAGE_BUCKET}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL');
    }

    const filePath = urlParts[1];

    // Delete file from storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      throw new Error(`Storage: Failed to delete image - ${error.message}`);
    }

    console.log('✅ Image deleted successfully:', filePath);
    return true;

  } catch (error) {
    console.error('❌ Error in deleteImageFromStorage:', error);
    return false;
  }
};

module.exports = {
  uploadImageToStorage,
  deleteImageFromStorage
};
