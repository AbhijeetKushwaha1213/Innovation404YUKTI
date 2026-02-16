/**
 * Google Gemini Vision API Service
 * Handles image analysis using Gemini 1.5 Pro
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System prompt for civic issue analysis
const SYSTEM_PROMPT = `You are an AI civic issue analysis engine.

CRITICAL INSTRUCTIONS:
- Do NOT generate generic or repetitive descriptions.
- Avoid template phrases like:
  "This image shows..."
  "There appears to be..."
  "The image depicts..."
  "A visible..."
- Each description must be context-specific to the exact visual elements in the image.
- Description must be SHORT (max 40 words).
- Focus on visible facts only.
- Include distinguishing details (size, material, location context, surroundings, damage pattern, number of objects, etc).
- If similar issue types are reported, vary wording naturally.
- Do not repeat previous phrasing patterns.

TASK:
1. Identify issue type (garbage, pothole, broken streetlight, water leakage, drainage, infrastructure damage, illegal dumping, graffiti, road damage, etc).
2. Evaluate authenticity and visibility.
3. Generate a UNIQUE and PRECISE short description.

Return ONLY valid JSON in this structure (no markdown, no code blocks):
{
  "issue_type": "string",
  "confidence_score": 0-100,
  "is_valid_issue": true/false,
  "severity_level": "Low | Medium | High",
  "generated_description": "string",
  "recommended_authority": "string",
  "priority_score": 1-5
}

DESCRIPTION RULES:
- 1–2 sentences maximum.
- 15–40 words only.
- Mention at least 2 distinct visual attributes.
- No vague wording.
- No repetitive phrasing across outputs.
- No explanation outside JSON.

SEVERITY GUIDELINES:
- Low: Minor inconvenience, cosmetic issues
- Medium: Needs attention, affects functionality
- High: Urgent, dangerous, or major impact

PRIORITY SCORE:
- 1-2: Low urgency
- 3: Medium urgency
- 4-5: High urgency, immediate action needed

RECOMMENDED AUTHORITY:
- Sanitation Department (garbage, waste)
- Public Works (roads, infrastructure)
- Electrical Department (streetlights, power)
- Water Department (leaks, drainage)
- Municipal Services (general issues)

Return ONLY the JSON object, nothing else.`;

/**
 * Analyze image using Gemini Vision API
 * 
 * @param {string} imageBase64 - Base64 encoded image
 * @param {string} mimeType - Image MIME type (image/jpeg or image/png)
 * @returns {Object} Parsed analysis result
 */
const analyzeImageWithGemini = async (imageBase64, mimeType) => {
  try {
    console.log('🤖 Initializing Gemini 1.5 Pro model...');

    // Get the generative model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro'
    });

    // Prepare the image part
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    };

    // Generate content with system prompt and image
    console.log('📤 Sending request to Gemini API...');
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      imagePart
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('📥 Received response from Gemini API');
    console.log('Raw response:', text);

    // Parse the JSON response safely
    const analysis = parseGeminiResponse(text);

    // Validate the response structure
    if (!validateAnalysisStructure(analysis)) {
      console.error('❌ Invalid analysis structure received from Gemini');
      return getFallbackResponse();
    }

    console.log('✅ Successfully parsed Gemini response');
    return analysis;

  } catch (error) {
    console.error('❌ Gemini API error:', error);

    // Check for specific error types
    if (error.message.includes('API key')) {
      throw new Error('Gemini API: Invalid API key');
    }

    if (error.message.includes('quota')) {
      throw new Error('Gemini API: Quota exceeded');
    }

    if (error.message.includes('rate limit')) {
      throw new Error('Gemini API: Rate limit exceeded');
    }

    // Return fallback response instead of throwing
    console.log('⚠️  Returning fallback response due to Gemini error');
    return getFallbackResponse();
  }
};

/**
 * Parse Gemini response safely
 * Handles various response formats (JSON, markdown code blocks, etc.)
 * 
 * @param {string} text - Raw response text from Gemini
 * @returns {Object} Parsed JSON object
 */
const parseGeminiResponse = (text) => {
  try {
    // Remove markdown code blocks if present
    let cleanText = text.trim();
    
    // Remove ```json and ``` markers
    cleanText = cleanText.replace(/```json\s*/gi, '');
    cleanText = cleanText.replace(/```\s*/g, '');
    
    // Try to find JSON object in the text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    // Parse JSON
    const parsed = JSON.parse(cleanText);
    
    return parsed;
  } catch (error) {
    console.error('❌ Failed to parse Gemini response:', error);
    console.error('Raw text:', text);
    
    // Return fallback if parsing fails
    return getFallbackResponse();
  }
};

/**
 * Validate analysis structure
 * 
 * @param {Object} analysis - Parsed analysis object
 * @returns {boolean} True if valid structure
 */
const validateAnalysisStructure = (analysis) => {
  if (!analysis || typeof analysis !== 'object') {
    return false;
  }

  const requiredFields = [
    'issue_type',
    'confidence_score',
    'is_valid_issue',
    'severity_level',
    'generated_description',
    'recommended_authority',
    'priority_score'
  ];

  for (const field of requiredFields) {
    if (!(field in analysis)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate data types and ranges
  if (typeof analysis.confidence_score !== 'number' || 
      analysis.confidence_score < 0 || 
      analysis.confidence_score > 100) {
    console.error('Invalid confidence_score');
    return false;
  }

  if (typeof analysis.is_valid_issue !== 'boolean') {
    console.error('Invalid is_valid_issue');
    return false;
  }

  if (!['Low', 'Medium', 'High'].includes(analysis.severity_level)) {
    console.error('Invalid severity_level');
    return false;
  }

  if (typeof analysis.priority_score !== 'number' || 
      analysis.priority_score < 1 || 
      analysis.priority_score > 5) {
    console.error('Invalid priority_score');
    return false;
  }

  return true;
};

/**
 * Get fallback response when Gemini fails
 * 
 * @returns {Object} Fallback analysis object
 */
const getFallbackResponse = () => {
  return {
    issue_type: 'Unclassified',
    confidence_score: 0,
    is_valid_issue: false,
    severity_level: 'Low',
    generated_description: 'Image analysis unavailable. Manual review required for accurate classification.',
    recommended_authority: 'Municipal Services',
    priority_score: 1
  };
};

module.exports = {
  analyzeImageWithGemini
};
