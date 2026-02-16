/**
 * Image Comparison Service
 * Uses perceptual hashing to compare image similarity
 */

const axios = require('axios');
const sharp = require('sharp');
const { createHash } = require('crypto');

/**
 * Compare two images using perceptual hashing
 * 
 * @param {string} beforeImageUrl - URL of before image
 * @param {string} afterImageUrl - URL of after image
 * @returns {Object} Comparison results
 */
const compareImages = async (beforeImageUrl, afterImageUrl) => {
  try {
    console.log('🖼️  Downloading images for comparison...');

    // Download both images
    const [beforeBuffer, afterBuffer] = await Promise.all([
      downloadImage(beforeImageUrl),
      downloadImage(afterImageUrl)
    ]);

    // Generate perceptual hashes
    console.log('🔢 Generating perceptual hashes...');
    const beforeHash = await generatePerceptualHash(beforeBuffer);
    const afterHash = await generatePerceptualHash(afterBuffer);

    // Calculate Hamming distance
    const hammingDistance = calculateHammingDistance(beforeHash, afterHash);
    
    // Convert to similarity percentage (0-100)
    // Lower Hamming distance = more similar
    // Max Hamming distance for 64-bit hash = 64
    const similarity = Math.max(0, 100 - (hammingDistance / 64) * 100);

    console.log(`📊 Similarity: ${similarity.toFixed(2)}%`);
    console.log(`🔍 Hamming distance: ${hammingDistance}`);

    return {
      similarity: Math.round(similarity),
      hashDifference: hammingDistance,
      beforeHash: beforeHash,
      afterHash: afterHash
    };

  } catch (error) {
    console.error('❌ Error comparing images:', error);
    
    // Return neutral comparison on error
    return {
      similarity: 50,
      hashDifference: 32,
      beforeHash: null,
      afterHash: null,
      error: error.message
    };
  }
};

/**
 * Download image from URL
 * 
 * @param {string} url - Image URL
 * @returns {Buffer} Image buffer
 */
const downloadImage = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
};

/**
 * Generate perceptual hash (pHash) for an image
 * Uses difference hash (dHash) algorithm for simplicity and speed
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {string} 64-bit hash as hex string
 */
const generatePerceptualHash = async (imageBuffer) => {
  try {
    // Resize to 9x8 grayscale image
    const resized = await sharp(imageBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Convert to array of pixel values
    const pixels = Array.from(resized);

    // Calculate difference hash
    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const index = row * 9 + col;
        const nextIndex = index + 1;
        
        // Compare each pixel with the one to its right
        hash += pixels[index] < pixels[nextIndex] ? '1' : '0';
      }
    }

    // Convert binary string to hex
    const hexHash = binaryToHex(hash);
    
    return hexHash;

  } catch (error) {
    console.error('Error generating perceptual hash:', error);
    throw error;
  }
};

/**
 * Calculate Hamming distance between two hashes
 * 
 * @param {string} hash1 - First hash (hex string)
 * @param {string} hash2 - Second hash (hex string)
 * @returns {number} Hamming distance (number of differing bits)
 */
const calculateHammingDistance = (hash1, hash2) => {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return 64; // Maximum distance if hashes are invalid
  }

  let distance = 0;

  // Convert hex to binary and compare bit by bit
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    
    // Count set bits in XOR result
    distance += countSetBits(xor);
  }

  return distance;
};

/**
 * Convert binary string to hexadecimal
 * 
 * @param {string} binary - Binary string
 * @returns {string} Hexadecimal string
 */
const binaryToHex = (binary) => {
  let hex = '';
  
  for (let i = 0; i < binary.length; i += 4) {
    const chunk = binary.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  
  return hex;
};

/**
 * Count number of set bits (1s) in a number
 * 
 * @param {number} n - Number
 * @returns {number} Count of set bits
 */
const countSetBits = (n) => {
  let count = 0;
  while (n > 0) {
    count += n & 1;
    n >>= 1;
  }
  return count;
};

/**
 * Generate MD5 hash of image (for exact duplicate detection)
 * 
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {string} MD5 hash
 */
const generateMD5Hash = (imageBuffer) => {
  return createHash('md5').update(imageBuffer).digest('hex');
};

module.exports = {
  compareImages,
  generatePerceptualHash,
  calculateHammingDistance,
  generateMD5Hash
};
