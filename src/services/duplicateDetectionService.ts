import { supabase } from '@/lib/supabase';
import { analyzeMultipleImages } from './visionService';

export interface DuplicateIssue {
  id: string;
  title: string;
  description: string;
  location: string;
  image: string;
  created_at: string;
  created_by: string;
  similarity_score: number;
  match_type: 'location' | 'image' | 'both';
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicates: DuplicateIssue[];
  confidence: number;
}

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Extract coordinates from location string
function extractCoordinates(location: string): { lat: number; lng: number } | null {
  // Try to extract coordinates from various formats
  const patterns = [
    /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,  // Basic lat,lng format
    /lat:\s*(-?\d+\.?\d*),?\s*lng:\s*(-?\d+\.?\d*)/i,  // lat: X, lng: Y format
    /latitude:\s*(-?\d+\.?\d*),?\s*longitude:\s*(-?\d+\.?\d*)/i,  // Full words
    /\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/  // Parentheses format
  ];
  
  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // Validate coordinates are within reasonable bounds
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
  }
  
  return null;
}

// Calculate text similarity using simple word overlap with keyword weighting
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Important keywords that indicate similar issues
  const importantKeywords = [
    'broken', 'damaged', 'pothole', 'streetlight', 'trash', 'garbage', 'water', 'leak',
    'flooding', 'drainage', 'blocked', 'overflowing', 'faulty', 'not working', 'repair',
    'maintenance', 'urgent', 'dangerous', 'safety', 'hazard'
  ];
  
  let weightedScore = 0;
  let totalWeight = 0;
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  // Calculate basic similarity
  const basicSimilarity = intersection.length / union.length;
  
  // Add weight for important keywords
  intersection.forEach(word => {
    const weight = importantKeywords.includes(word) ? 2 : 1;
    weightedScore += weight;
    totalWeight += weight;
  });
  
  union.forEach(word => {
    if (!intersection.includes(word)) {
      const weight = importantKeywords.includes(word) ? 2 : 1;
      totalWeight += weight;
    }
  });
  
  const weightedSimilarity = totalWeight > 0 ? weightedScore / totalWeight : 0;
  
  // Return the higher of basic or weighted similarity
  return Math.max(basicSimilarity, weightedSimilarity);
}

// Analyze image similarity using Vision API
async function analyzeImageSimilarity(newImageBase64: string, existingImageBase64: string): Promise<number> {
  try {
    // Convert base64 to File objects for analysis
    const newImageBlob = await fetch(newImageBase64).then(r => r.blob());
    const existingImageBlob = await fetch(existingImageBase64).then(r => r.blob());
    
    const newImageFile = new File([newImageBlob], 'new.jpg', { type: 'image/jpeg' });
    const existingImageFile = new File([existingImageBlob], 'existing.jpg', { type: 'image/jpeg' });
    
    // Analyze both images
    const [newAnalysis, existingAnalysis] = await analyzeMultipleImages([newImageFile, existingImageFile]);
    
    if (!newAnalysis || !existingAnalysis) return 0;
    
    // Compare descriptions for similarity
    const textSimilarity = calculateTextSimilarity(newAnalysis.description, existingAnalysis.description);
    
    // Compare categories
    const categorySimilarity = newAnalysis.category === existingAnalysis.category ? 0.3 : 0;
    
    return Math.min(textSimilarity + categorySimilarity, 1);
  } catch (error) {
    console.error('Error analyzing image similarity:', error);
    return 0;
  }
}

// Check for duplicate issues
export async function checkForDuplicates(
  description: string,
  location: string,
  coordinates: { lat: number; lng: number } | null,
  imageBase64?: string,
  category?: string
): Promise<DuplicateDetectionResult> {
  try {
    console.log('🔍 Duplicate Detection Service - Starting check...');
    console.log('Input parameters:', { 
      description: description.substring(0, 50) + '...', 
      location, 
      coordinates, 
      hasImage: !!imageBase64,
      category 
    });
    
    // Fetch recent issues (last 30 days) to check against
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('Fetching issues since:', thirtyDaysAgo.toISOString());
    
    const { data: existingIssues, error } = await supabase
      .from('issues')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .neq('status', 'resolved'); // Don't check against resolved issues
    
    if (error) {
      console.error('❌ Error fetching existing issues:', error);
      return { isDuplicate: false, duplicates: [], confidence: 0 };
    }
    
    console.log(`✅ Fetched ${existingIssues?.length || 0} existing issues to check against`);
    
    if (!existingIssues || existingIssues.length === 0) {
      console.log('No existing issues to compare against');
      return { isDuplicate: false, duplicates: [], confidence: 0 };
    }
    
    const duplicates: DuplicateIssue[] = [];
    
    for (const issue of existingIssues) {
      let similarityScore = 0;
      let matchType: 'location' | 'image' | 'both' = 'location';
      
      // 1. Check location proximity
      let locationSimilarity = 0;
      if (coordinates) {
        const issueCoords = extractCoordinates(issue.location);
        if (issueCoords) {
          const distance = calculateDistance(
            coordinates.lat, coordinates.lng,
            issueCoords.lat, issueCoords.lng
          );
          
          // Consider locations within 100 meters as potentially duplicate
          if (distance <= 0.1) { // 100 meters
            locationSimilarity = Math.max(0, 1 - (distance / 0.1));
          }
        }
      }
      
      // 2. Check text similarity
      const textSimilarity = calculateTextSimilarity(description, issue.description);
      
      // 3. Check category similarity
      const categorySimilarity = category && issue.category === category ? 0.2 : 0;
      
      // 4. Check image similarity if both have images
      let imageSimilarity = 0;
      if (imageBase64 && issue.image) {
        try {
          imageSimilarity = await analyzeImageSimilarity(imageBase64, issue.image);
          if (imageSimilarity > 0.3) {
            matchType = locationSimilarity > 0.3 ? 'both' : 'image';
          }
        } catch (error) {
          console.error('Error comparing images:', error);
        }
      }
      
      // Calculate overall similarity score
      similarityScore = Math.max(
        locationSimilarity * 0.4 + textSimilarity * 0.4 + categorySimilarity * 0.2,
        imageSimilarity * 0.6 + locationSimilarity * 0.2 + textSimilarity * 0.2
      );
      
      // Consider it a potential duplicate if similarity > 60%
      if (similarityScore > 0.6) {
        duplicates.push({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          location: issue.location,
          image: issue.image,
          created_at: issue.created_at,
          created_by: issue.created_by,
          similarity_score: similarityScore,
          match_type: matchType
        });
      }
    }
    
    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarity_score - a.similarity_score);
    
    const isDuplicate = duplicates.length > 0;
    const confidence = isDuplicate ? duplicates[0].similarity_score : 0;
    
    console.log(`✅ Duplicate check complete. Found ${duplicates.length} potential duplicates.`);
    if (isDuplicate) {
      console.log('Top match:', {
        id: duplicates[0].id,
        title: duplicates[0].title,
        similarity: Math.round(duplicates[0].similarity_score * 100) + '%',
        matchType: duplicates[0].match_type
      });
    }
    
    return {
      isDuplicate,
      duplicates: duplicates.slice(0, 3), // Return top 3 matches
      confidence
    };
    
  } catch (error) {
    console.error('❌ Error in duplicate detection:', error);
    return { isDuplicate: false, duplicates: [], confidence: 0 };
  }
}

// Format time ago for display
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} week${Math.ceil(diffDays / 7) > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}