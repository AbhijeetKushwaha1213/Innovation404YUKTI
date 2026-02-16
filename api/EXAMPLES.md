# API Examples - Request & Response

## Example 1: Successful Analysis - Pothole

### Request

```http
POST /api/report/analyze HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="title"

Large pothole on Main Street
------WebKitFormBoundary
Content-Disposition: form-data; name="image"; filename="pothole.jpg"
Content-Type: image/jpeg

[Binary image data]
------WebKitFormBoundary--
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Large pothole on Main Street",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user123/abc-def-ghi.jpg",
    "analysis": {
      "issue_type": "Pothole",
      "description": "The image shows a large pothole in the road surface, approximately 2 feet in diameter with exposed edges. The damage appears to be deep and could pose a hazard to vehicles.",
      "confidence_score": 92,
      "severity_level": "High",
      "priority_score": 4,
      "is_valid_issue": true,
      "recommended_authority": "Public Works Department"
    },
    "created_at": "2024-02-16T10:30:45.123Z"
  }
}
```

---

## Example 2: Successful Analysis - Garbage Accumulation

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Garbage pile near park entrance" \
  -F "image=@garbage_pile.jpg"
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
    "title": "Garbage pile near park entrance",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user456/xyz-abc-def.jpg",
    "analysis": {
      "issue_type": "Garbage Accumulation",
      "description": "The image depicts a significant accumulation of garbage bags and loose waste near what appears to be a park entrance. The pile is approximately 4-5 feet high and includes various types of household waste.",
      "confidence_score": 88,
      "severity_level": "Medium",
      "priority_score": 3,
      "is_valid_issue": true,
      "recommended_authority": "Sanitation Department"
    },
    "created_at": "2024-02-16T11:15:22.456Z"
  }
}
```

---

## Example 3: Successful Analysis - Broken Streetlight

### Request (JavaScript Fetch)

```javascript
const formData = new FormData();
formData.append('title', 'Non-functional streetlight on Oak Avenue');
formData.append('image', imageFile); // File object from input

const response = await fetch('http://localhost:3000/api/report/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "c3d4e5f6-g7h8-9012-cdef-gh3456789012",
    "title": "Non-functional streetlight on Oak Avenue",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user789/mno-pqr-stu.jpg",
    "analysis": {
      "issue_type": "Broken Streetlight",
      "description": "The image shows a streetlight pole with a non-illuminated lamp fixture. The surrounding area appears dark, suggesting the light is not functioning during nighttime hours.",
      "confidence_score": 85,
      "severity_level": "High",
      "priority_score": 4,
      "is_valid_issue": true,
      "recommended_authority": "Electrical Department"
    },
    "created_at": "2024-02-16T19:45:33.789Z"
  }
}
```

---

## Example 4: Low Confidence - Unclear Image

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Unclear issue" \
  -F "image=@blurry_image.jpg"
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "d4e5f6g7-h8i9-0123-defg-hi4567890123",
    "title": "Unclear issue",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user101/vwx-yza-bcd.jpg",
    "analysis": {
      "issue_type": "Unclassified",
      "description": "The image quality is too low or unclear to accurately identify a specific civic issue. Please provide a clearer image or manual description.",
      "confidence_score": 25,
      "severity_level": "Low",
      "priority_score": 1,
      "is_valid_issue": false,
      "recommended_authority": "General Services"
    },
    "created_at": "2024-02-16T12:20:15.234Z"
  }
}
```

---

## Example 5: Error - Missing Image

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Issue without image"
```

### Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Image file is required."
}
```

---

## Example 6: Error - Invalid File Type

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test issue" \
  -F "image=@document.pdf"
```

### Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Invalid file type. Only JPEG and PNG are allowed."
}
```

---

## Example 7: Error - File Too Large

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Large image test" \
  -F "image=@huge_image_10mb.jpg"
```

### Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Image size must be less than 5MB."
}
```

---

## Example 8: Error - Missing Title

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@issue.jpg"
```

### Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Title is required."
}
```

---

## Example 9: Error - Invalid Token

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer invalid_token_here" \
  -F "title=Test issue" \
  -F "image=@issue.jpg"
```

### Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Invalid or expired token."
}
```

---

## Example 10: Error - No Token

### Request

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -F "title=Test issue" \
  -F "image=@issue.jpg"
```

### Response (401 Unauthorized)

```json
{
  "success": false,
  "error": "Authentication required. No token provided."
}
```

---

## Example 11: Gemini API Fallback

### Scenario
Gemini API is temporarily unavailable or returns invalid response.

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "e5f6g7h8-i9j0-1234-efgh-ij5678901234",
    "title": "Issue during API outage",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user202/efg-hij-klm.jpg",
    "analysis": {
      "issue_type": "Unclassified",
      "description": "Unable to analyze image automatically. Please provide a manual description.",
      "confidence_score": 0,
      "severity_level": "Low",
      "priority_score": 1,
      "is_valid_issue": false,
      "recommended_authority": "General Services"
    },
    "created_at": "2024-02-16T14:30:00.000Z"
  }
}
```

---

## Example 12: Water Leakage Detection

### Response (201 Created)

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "f6g7h8i9-j0k1-2345-fghi-jk6789012345",
    "title": "Water leakage from underground pipe",
    "image_url": "https://vzqtjhoevvjxdgocnfju.supabase.co/storage/v1/object/public/report-images/user303/nop-qrs-tuv.jpg",
    "analysis": {
      "issue_type": "Water Leakage",
      "description": "The image shows water pooling on the street surface with visible flow from what appears to be an underground pipe leak. The water is clear and flowing continuously, indicating an active leak.",
      "confidence_score": 94,
      "severity_level": "High",
      "priority_score": 5,
      "is_valid_issue": true,
      "recommended_authority": "Water Department"
    },
    "created_at": "2024-02-16T15:45:12.567Z"
  }
}
```

---

## Frontend Integration Example (React)

```javascript
import { useState } from 'react';
import { supabase } from './supabaseClient';

const ReportForm = () => {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get JWT token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please sign in first');
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('image', image);

      // Send request to backend
      const response = await fetch('http://localhost:3000/api/report/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        alert('Report submitted successfully!');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Issue title"
        required
      />
      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={(e) => setImage(e.target.files[0])}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Analyzing...' : 'Submit Report'}
      </button>

      {result && (
        <div>
          <h3>Analysis Result:</h3>
          <p>Type: {result.analysis.issue_type}</p>
          <p>Confidence: {result.analysis.confidence_score}%</p>
          <p>Severity: {result.analysis.severity_level}</p>
          <p>Description: {result.analysis.description}</p>
        </div>
      )}
    </form>
  );
};

export default ReportForm;
```

---

## Testing Checklist

- [ ] Valid image upload (JPEG)
- [ ] Valid image upload (PNG)
- [ ] Invalid file type (PDF, GIF, etc.)
- [ ] File size > 5MB
- [ ] Missing image
- [ ] Missing title
- [ ] Valid JWT token
- [ ] Invalid JWT token
- [ ] Expired JWT token
- [ ] No JWT token
- [ ] Clear image (high confidence)
- [ ] Blurry image (low confidence)
- [ ] Non-issue image (is_valid_issue: false)
- [ ] Rate limiting (>100 requests)
- [ ] Gemini API failure (fallback)
- [ ] Database connection failure
- [ ] Storage upload failure

---

## Performance Benchmarks

- Average response time: 2-4 seconds
- Gemini API call: 1-2 seconds
- Image upload: 0.5-1 second
- Database save: 0.1-0.3 seconds
- Max concurrent requests: 100/15min per IP
