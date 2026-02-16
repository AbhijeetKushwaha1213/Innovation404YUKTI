/**
 * Gemini AI Resolution Verification Service
 * Compares before/after images to verify issue resolution
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt for resolution verification
const VERIFICATION_PROMPT = `You are an AI civic resolution verification engine.

You are given:
1. BEFORE image (original issue image)
2. AFTER image (worker resolution image)
3. Original issue type

Your task:
1. Determine whether the AFTER image appears to be from the SAME location.
2. Determine whether the issue appears RESOLVED.
3. Identify inconsistencies, manipulation, or mismatched scenes.
4. Detect if AFTER image is unrelated to BEFORE image.
5. Output structured verification analysis.

Rules:
- Base decision only on visible evidence.
- If location landmarks differ significantly → mark mismatch.
- If issue object still visible → not resolved.
- If AFTER image lacks context → lower confidence.
- If BEFORE and AFTER appear from different environments → mark suspicious.
- Be strict and analytical.

Return JSON only:
{
  "same_location": true/false,
  "issue_resolved": true/false,
  "visual_similarity_score": 0-100,
  "resolution_confidence": 0-100,
  "suspicious": true/false,
  "suspicion_reason": "",
  "analysis_summary": ""
}

Be precise and concise.
No generic explanations.
No text outside JSON.`;

/**
 * Verify resolution using Gemini Vision API
 * 
 * @param {string} beforeImageUrl - URL of before image
 * @param {string} afterImageUrl - URL of after image
 * @param {string} issueType - Type of issue
 * @returns {Object} Verification result
 */
const verifyResolutionWithGemini = async (beforeImageUrl, afterImageUrl, issueType) => {
  try {
    console.log('🤖 Initializing Gemini verification...');
    console.log(`📋 Issue type: ${issueType}`);

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro'
    });

    // Download images and convert to base64
    console.log('📥 Downloading images...');
    const [beforeBase64, afterBase64] = await Promise.all([
      downloadAndConvertToBase64(beforeImageUrl),
      downloadAndConvertToBase64(afterImageUrl)
    ]);

    // Prepare image parts
    const beforeImagePart = {
      inlineData: {
        data: beforeBase64.data,
        mimeType: beforeBase64.mimeType
      }
    };

    const afterImagePart = {
      inlineData: {
        data: afterBase64.data,
        mimeType: afterBase64.mimeType
      }
    };

    // Create prompt with context
    const contextPrompt = `${VERIFICATION_PROMPT}

Original Issue Type: ${issueType}

Analyze these two images:
1. BEFORE image (original issue)
2. AFTER image (claimed resolution)

Provide verification analysis in JSON format.`;

    // Generate content with both images
    console.log('📤 Sending to Gemini API...');
    const result = await model.generateContent([
      contextPrompt,
      beforeImagePart,
      afterImagePart
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('📥 Received response from Gemini');
    console.log('Raw response:', text);

    // Parse the JSON response
    const verification = parseVerificationResponse(text);

    // Validate response structure
    if (!validateVerificationStructure(verification)) {
      console.error('❌ Invalid verification structure');
      return getFallbackVerification();
    }

    console.log('✅ Verification parsed successfully');
    return verification;

  } catch (error) {
    console.error('❌ Gemini verification error:', error);

    // Check for specific error types
    if (error.message.includes('API key')) {
      throw new Error('Gemini API: Invalid API key');
    }

    if (error.message.includes('quota')) {
      throw new Error('Gemini API: Quota exceeded');
    }

    // Return fallback verification
    console.log('⚠️  Returning fallback verification');
    return getFallbackVerification();
  }
};

/**
 * Download image and convert to base64
 * 
 * @param {string} url - Image URL
 * @returns {Object} Base64 data and mime type
 */
const downloadAndConvertToBase64 = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const base64 = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'] || 'image/jpeg';

    return {
      data: base64,
      mimeType: mimeType
    };

  } catch (error) {
    console.error(`Error downloading image from ${url}:`, error.message);
    throw new Error(`Failed to download image: ${error.message}`);
  }
};

/**
 * Parse Gemini verification response
 * 
 * @param {string} text - Raw response text
 * @returns {Object} Parsed verification object
 */
const parseVerificationResponse = (text) => {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    
    cleanText = cleanText.replace(/```json\s*/gi, '');
    cleanText = cleanText.replace(/```\s*/g, '');
    
    // Try to find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    // Parse JSON
    const parsed = JSON.parse(cleanText);
    
    return parsed;

  } catch (error) {
    console.error('❌ Failed to parse verification response:', error);
    console.error('Raw text:', text);
    
    return getFallbackVerification();
  }
};

/**
 * Validate verification response structure
 * 
 * @param {Object} verification - Parsed verification object
 * @returns {boolean} True if valid
 */
const validateVerificationStructure = (verification) => {
  if (!verification || typeof verification !== 'object') {
    return false;
  }

  const requiredFields = [
    'same_location',
    'issue_resolved',
    'visual_similarity_score',
    'resolution_confidence',
    'suspicious',
    'suspicion_reason',
    'analysis_summary'
  ];

  for (const field of requiredFields) {
    if (!(field in verification)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate data types
  if (typeof verification.same_location !== 'boolean') {
    console.error('Invalid same_location type');
    return false;
  }

  if (typeof verification.issue_resolved !== 'boolean') {
    console.error('Invalid issue_resolved type');
    return false;
  }

  if (typeof verification.suspicious !== 'boolean') {
    console.error('Invalid suspicious type');
    return false;
  }

  if (typeof verification.visual_similarity_score !== 'number' ||
      verification.visual_similarity_score < 0 ||
      verification.visual_similarity_score > 100) {
    console.error('Invalid visual_similarity_score');
    return false;
  }

  if (typeof verification.resolution_confidence !== 'number' ||
      verification.resolution_confidence < 0 ||
      verification.resolution_confidence > 100) {
    console.error('Invalid resolution_confidence');
    return false;
  }

  return true;
};

/**
 * Get fallback verification when Gemini fails
 * 
 * @returns {Object} Fallback verification object
 */
const getFallbackVerification = () => {
  return {
    same_location: false,
    issue_resolved: false,
    visual_similarity_score: 0,
    resolution_confidence: 0,
    suspicious: true,
    suspicion_reason: 'AI verification unavailable - manual review required',
    analysis_summary: 'Automated verification could not be completed. Manual inspection recommended.'
  };
};

module.exports = {
  verifyResolutionWithGemini
};
