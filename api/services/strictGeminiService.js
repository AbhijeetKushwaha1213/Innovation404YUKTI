/**
 * STRICT Gemini AI Verification Service
 * Enhanced with fake detection and forensic analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// STRICT system prompt for forensic verification
const STRICT_VERIFICATION_PROMPT = `You are an AI forensic image verification system.

You are given:
1. BEFORE image (original issue)
2. AFTER image (worker resolution image)
3. Issue type

Your tasks:
1. Determine if AFTER image appears captured at the same physical location.
2. Determine if the reported issue is visibly resolved.
3. Detect if AFTER image is unrelated to BEFORE image.
4. Detect signs of:
   - AI-generated content
   - Stock image usage
   - Digital manipulation
   - Reused or staged photo
   - Inconsistent lighting/shadows
   - Unnatural artifacts

Rules:
- If landmarks differ → same_location = false
- If issue object still present → issue_resolved = false
- If scene structure is inconsistent → suspicious = true
- If image appears overly clean or artificial → fake_detected = true
- If lighting/weather/time mismatch → suspicious
- If shadows don't match → suspicious
- If perspective is impossible → fake_detected = true
- Be strict and skeptical
- Base decision only on visible evidence

Return ONLY JSON:
{
  "same_location": true/false,
  "issue_resolved": true/false,
  "fake_detected": true/false,
  "visual_consistency_score": 0-100,
  "resolution_confidence": 0-100,
  "suspicious": true/false,
  "suspicion_reason": "",
  "analysis_summary": ""
}

Be analytical.
No assumptions.
No text outside JSON.`;

/**
 * STRICT verification using Gemini Vision API with fake detection
 * 
 * @param {string} beforeImageUrl - URL of before image
 * @param {string} afterImageUrl - URL of after image
 * @param {string} issueType - Type of issue
 * @returns {Object} Strict verification result
 */
const strictVerifyWithGemini = async (beforeImageUrl, afterImageUrl, issueType) => {
  try {
    console.log('🤖 Initializing STRICT Gemini verification...');
    console.log(`📋 Issue type: ${issueType}`);

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro'
    });

    // Download images and convert to base64
    console.log('📥 Downloading images for AI analysis...');
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
    const contextPrompt = `${STRICT_VERIFICATION_PROMPT}

Original Issue Type: ${issueType}

Analyze these two images with STRICT forensic scrutiny:
1. BEFORE image (original issue)
2. AFTER image (claimed resolution)

Detect any signs of manipulation, AI generation, or fraud.
Provide strict verification analysis in JSON format.`;

    // Generate content with both images
    console.log('📤 Sending to Gemini API for forensic analysis...');
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
    const verification = parseStrictVerificationResponse(text);

    // Validate response structure
    if (!validateStrictVerificationStructure(verification)) {
      console.error('❌ Invalid verification structure');
      return getStrictFallbackVerification();
    }

    console.log('✅ Strict verification parsed successfully');
    return verification;

  } catch (error) {
    console.error('❌ Gemini strict verification error:', error);

    // Check for specific error types
    if (error.message.includes('API key')) {
      throw new Error('Gemini API: Invalid API key');
    }

    if (error.message.includes('quota')) {
      throw new Error('Gemini API: Quota exceeded');
    }

    // Return strict fallback (mark as suspicious)
    console.log('⚠️  Returning strict fallback verification');
    return getStrictFallbackVerification();
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
 * Parse strict verification response
 * 
 * @param {string} text - Raw response text
 * @returns {Object} Parsed verification object
 */
const parseStrictVerificationResponse = (text) => {
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
    console.error('❌ Failed to parse strict verification response:', error);
    console.error('Raw text:', text);
    
    return getStrictFallbackVerification();
  }
};

/**
 * Validate strict verification response structure
 * 
 * @param {Object} verification - Parsed verification object
 * @returns {boolean} True if valid
 */
const validateStrictVerificationStructure = (verification) => {
  if (!verification || typeof verification !== 'object') {
    return false;
  }

  const requiredFields = [
    'same_location',
    'issue_resolved',
    'fake_detected',
    'visual_consistency_score',
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

  if (typeof verification.fake_detected !== 'boolean') {
    console.error('Invalid fake_detected type');
    return false;
  }

  if (typeof verification.suspicious !== 'boolean') {
    console.error('Invalid suspicious type');
    return false;
  }

  if (typeof verification.visual_consistency_score !== 'number' ||
      verification.visual_consistency_score < 0 ||
      verification.visual_consistency_score > 100) {
    console.error('Invalid visual_consistency_score');
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
 * Get strict fallback verification (mark as suspicious)
 * 
 * @returns {Object} Strict fallback verification object
 */
const getStrictFallbackVerification = () => {
  return {
    same_location: false,
    issue_resolved: false,
    fake_detected: false, // Don't assume fake on error
    visual_consistency_score: 0,
    resolution_confidence: 0,
    suspicious: true,
    suspicion_reason: 'AI verification unavailable - automatic SUSPICIOUS marking for manual review',
    analysis_summary: 'Automated verification could not be completed. Manual inspection required for security.'
  };
};

module.exports = {
  strictVerifyWithGemini
};
