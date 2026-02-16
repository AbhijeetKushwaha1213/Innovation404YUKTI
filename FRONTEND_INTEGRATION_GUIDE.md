# Frontend Integration Guide - Resolution Verification

## Overview

This guide shows how to integrate the AI-powered resolution verification system into your React frontend.

## Prerequisites

- Backend server running on `http://localhost:3000`
- Supabase authentication configured
- Worker/official user logged in

## Integration Steps

### 1. Create Resolution Upload Component

Create a new component for workers to upload resolution images:

```typescript
// src/components/UploadResolution.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, MapPin, Loader2 } from 'lucide-react';

const UploadResolution = () => {
  const { id: reportId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Get current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast({
          title: 'Location captured',
          description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: 'Location error',
          description: 'Failed to get your location. Please enable location services.',
          variant: 'destructive',
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG or PNG image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit resolution
  const handleSubmit = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to submit resolution.',
        variant: 'destructive',
      });
      return;
    }

    if (!image) {
      toast({
        title: 'Image required',
        description: 'Please upload an after image.',
        variant: 'destructive',
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Location required',
        description: 'Please capture your current location.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get JWT token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('image', image);
      formData.append('lat', location.lat.toString());
      formData.append('lng', location.lng.toString());

      // Send to backend
      const response = await fetch(
        `http://localhost:3000/api/report/${reportId}/verify-resolution`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit resolution');
      }

      // Handle response
      if (data.success) {
        const isSuspicious = data.data.is_suspicious;
        
        toast({
          title: isSuspicious ? 'Resolution submitted for review' : 'Resolution verified!',
          description: isSuspicious 
            ? 'Your submission has been flagged for manual review.'
            : 'The issue has been successfully verified as resolved.',
          variant: isSuspicious ? 'default' : 'default',
        });

        // Show verification details
        console.log('Verification results:', data.data);

        // Navigate back to report
        setTimeout(() => {
          navigate(`/issues/${reportId}`);
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error submitting resolution:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit resolution. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Resolution</h2>

      {/* Image Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          After Image
        </label>
        
        {imagePreview ? (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Click to upload image</span>
            <span className="text-xs text-gray-400 mt-1">JPEG or PNG, max 5MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Current Location
        </label>
        
        {location ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <MapPin className="w-5 h-5" />
              <span className="font-mono text-sm">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </span>
            </div>
          </div>
        ) : (
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            variant="outline"
            className="w-full"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Capture Current Location
              </>
            )}
          </Button>
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!image || !location || isUploading}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying resolution...
          </>
        ) : (
          'Submit Resolution'
        )}
      </Button>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Verification Process</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your image will be analyzed by AI</li>
          <li>• Location will be verified against original report</li>
          <li>• Image similarity will be checked</li>
          <li>• Resolution will be confirmed or flagged for review</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadResolution;
```

### 2. Add Route

Add the route to your router:

```typescript
// src/App.tsx or router configuration

import UploadResolution from '@/components/UploadResolution';

// Add route
<Route path="/issues/:id/resolve" element={<UploadResolution />} />
```

### 3. Add Button to Issue Detail

Add a button for workers to upload resolution:

```typescript
// In your IssueDetail component

{currentUser && isWorker && issue.status === 'pending' && (
  <Button
    onClick={() => navigate(`/issues/${id}/resolve`)}
    className="bg-green-600 hover:bg-green-700"
  >
    Upload Resolution
  </Button>
)}
```

### 4. Display Verification Results

Show verification results on the issue detail page:

```typescript
// In your IssueDetail component

const [verificationResults, setVerificationResults] = useState(null);

useEffect(() => {
  const fetchVerificationResults = async () => {
    const { data, error } = await supabase
      .from('resolution_uploads')
      .select('*')
      .eq('report_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setVerificationResults(data);
    }
  };

  fetchVerificationResults();
}, [id]);

// Display results
{verificationResults && (
  <div className={`p-4 rounded-lg border ${
    verificationResults.ai_verification_status === 'verified'
      ? 'bg-green-50 border-green-200'
      : 'bg-yellow-50 border-yellow-200'
  }`}>
    <h3 className="font-semibold mb-2">
      {verificationResults.ai_verification_status === 'verified'
        ? '✓ Resolution Verified'
        : '⚠ Resolution Under Review'}
    </h3>
    
    <div className="text-sm space-y-1">
      <p>Location Match: {verificationResults.same_location ? 'Yes' : 'No'}</p>
      <p>Distance: {verificationResults.location_distance?.toFixed(2)}m</p>
      <p>Image Similarity: {verificationResults.image_similarity}%</p>
      <p>AI Confidence: {verificationResults.ai_confidence_score}%</p>
      
      {verificationResults.suspicion_reason && (
        <p className="text-yellow-700 mt-2">
          Reason: {verificationResults.suspicion_reason}
        </p>
      )}
    </div>
  </div>
)}
```

## API Response Structure

### Success Response (Verified)

```json
{
  "success": true,
  "message": "Resolution verified successfully!",
  "data": {
    "resolution_id": "xyz-789",
    "report_id": "abc-123",
    "verification_status": "verified",
    "report_status": "verified",
    "is_suspicious": false,
    "verification": {
      "location_match": true,
      "location_distance": "45.23m",
      "image_similarity": "72%",
      "ai_confidence": 85,
      "same_location": true,
      "issue_resolved": true,
      "visual_similarity": 68,
      "analysis_summary": "Location landmarks match. Issue appears resolved."
    },
    "suspicion_flags": null,
    "exif_metadata": {
      "has_gps": true,
      "camera": {
        "make": "Apple",
        "model": "iPhone 13"
      },
      "timestamp": "2024:02:16 10:30:45"
    }
  }
}
```

### Success Response (Suspicious)

```json
{
  "success": true,
  "message": "Resolution submitted but marked as suspicious for review.",
  "data": {
    "verification_status": "suspicious",
    "is_suspicious": true,
    "suspicion_flags": [
      "Location mismatch: 250m away from original report",
      "Images appear completely unrelated"
    ]
  }
}
```

## Error Handling

```typescript
try {
  const response = await fetch(endpoint, options);
  const data = await response.json();

  if (!response.ok) {
    switch (response.status) {
      case 400:
        // Bad request - validation error
        toast({ title: 'Validation Error', description: data.error });
        break;
      case 401:
        // Unauthorized - invalid token
        toast({ title: 'Authentication Failed', description: 'Please sign in again.' });
        break;
      case 403:
        // Forbidden - not a worker
        toast({ title: 'Access Denied', description: 'Worker privileges required.' });
        break;
      case 404:
        // Not found - invalid report ID
        toast({ title: 'Report Not Found', description: data.error });
        break;
      case 503:
        // Service unavailable - AI service down
        toast({ title: 'Service Unavailable', description: 'Please try again later.' });
        break;
      default:
        toast({ title: 'Error', description: data.error || 'Something went wrong.' });
    }
    return;
  }

  // Handle success
  if (data.data.is_suspicious) {
    // Show warning for suspicious resolution
  } else {
    // Show success for verified resolution
  }

} catch (error) {
  console.error('Network error:', error);
  toast({ title: 'Network Error', description: 'Failed to connect to server.' });
}
```

## Environment Configuration

Make sure your frontend has the backend URL configured:

```typescript
// src/config.ts or .env

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

## Testing

### Test Checklist

- [ ] Worker can access upload resolution page
- [ ] Image upload works (JPEG/PNG, < 5MB)
- [ ] Location capture works
- [ ] Form validation works
- [ ] Submission shows loading state
- [ ] Success message displays
- [ ] Verification results display
- [ ] Error handling works
- [ ] Navigation works after submission

### Test Scenarios

1. **Valid Resolution**
   - Upload image from same location
   - Should show "verified" status

2. **Wrong Location**
   - Upload image from different location
   - Should show "suspicious" status

3. **Invalid Image**
   - Try uploading PDF or large file
   - Should show validation error

4. **No Location**
   - Try submitting without location
   - Should show error

## Security Considerations

1. **JWT Token**
   - Always use fresh token from Supabase session
   - Handle token expiration

2. **File Validation**
   - Validate file type on frontend
   - Validate file size on frontend
   - Backend will validate again

3. **Location**
   - Request high accuracy GPS
   - Handle location permission denial
   - Show clear error messages

## Performance Tips

1. **Image Optimization**
   - Consider compressing images before upload
   - Show upload progress

2. **Loading States**
   - Show spinner during upload
   - Disable submit button while uploading
   - Show verification progress

3. **Error Recovery**
   - Allow retry on failure
   - Save form state
   - Clear form after success

---

**Next Steps:**
1. Implement the UploadResolution component
2. Add route to your router
3. Test with real images
4. Monitor verification results
5. Handle edge cases

**Need Help?**
- Check `api/RESOLUTION_VERIFICATION.md` for backend details
- See `api/test-verification.sh` for testing
- Review error responses in documentation
