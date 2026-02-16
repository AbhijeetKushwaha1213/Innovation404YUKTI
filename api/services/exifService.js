/**
 * EXIF Metadata Extraction Service
 * Extracts GPS and camera metadata from images
 */

const ExifReader = require('exifreader');

/**
 * Extract EXIF metadata from image buffer
 * 
 * @param {Buffer} imageBuffer - Image file buffer
 * @returns {Object} Extracted metadata
 */
const extractEXIFMetadata = async (imageBuffer) => {
  try {
    console.log('📸 Extracting EXIF metadata...');

    const tags = ExifReader.load(imageBuffer);
    
    const metadata = {
      gps: null,
      camera: null,
      timestamp: null
    };

    // Extract GPS coordinates
    if (tags.GPSLatitude && tags.GPSLongitude) {
      const lat = convertDMSToDD(
        tags.GPSLatitude.description,
        tags.GPSLatitudeRef?.value?.[0] || 'N'
      );
      
      const lng = convertDMSToDD(
        tags.GPSLongitude.description,
        tags.GPSLongitudeRef?.value?.[0] || 'E'
      );

      if (lat !== null && lng !== null) {
        metadata.gps = {
          latitude: lat,
          longitude: lng,
          altitude: tags.GPSAltitude?.description || null
        };
        
        console.log(`✅ GPS found: ${lat}, ${lng}`);
      }
    } else {
      console.log('⚠️  No GPS data in EXIF');
    }

    // Extract camera information
    if (tags.Make || tags.Model) {
      metadata.camera = {
        make: tags.Make?.description || null,
        model: tags.Model?.description || null,
        software: tags.Software?.description || null
      };
    }

    // Extract timestamp
    if (tags.DateTime || tags.DateTimeOriginal) {
      metadata.timestamp = tags.DateTimeOriginal?.description || tags.DateTime?.description || null;
    }

    return metadata;

  } catch (error) {
    console.error('❌ Error extracting EXIF metadata:', error);
    
    // Return empty metadata if extraction fails
    return {
      gps: null,
      camera: null,
      timestamp: null
    };
  }
};

/**
 * Convert DMS (Degrees, Minutes, Seconds) to Decimal Degrees
 * 
 * @param {string} dmsString - DMS string (e.g., "40° 26' 46.302\"")
 * @param {string} ref - Reference (N/S for latitude, E/W for longitude)
 * @returns {number|null} Decimal degrees
 */
const convertDMSToDD = (dmsString, ref) => {
  try {
    // Parse DMS string
    const parts = dmsString.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"/);
    
    if (!parts) {
      // Try alternative format: "40, 26, 46.302"
      const altParts = dmsString.split(',').map(s => parseFloat(s.trim()));
      if (altParts.length === 3) {
        const degrees = altParts[0];
        const minutes = altParts[1];
        const seconds = altParts[2];
        
        let dd = degrees + (minutes / 60) + (seconds / 3600);
        
        // Apply reference direction
        if (ref === 'S' || ref === 'W') {
          dd = -dd;
        }
        
        return dd;
      }
      
      return null;
    }

    const degrees = parseFloat(parts[1]);
    const minutes = parseFloat(parts[2]);
    const seconds = parseFloat(parts[3]);

    let dd = degrees + (minutes / 60) + (seconds / 3600);

    // Apply reference direction
    if (ref === 'S' || ref === 'W') {
      dd = -dd;
    }

    return dd;

  } catch (error) {
    console.error('Error converting DMS to DD:', error);
    return null;
  }
};

module.exports = {
  extractEXIFMetadata
};
