# Civic Issue Backend - Gemini Vision API Integration

Production-ready backend module for analyzing civic issue images using Google Gemini 1.5 Pro Vision API.

## 🏗️ Architecture

```
api/
├── server.js                 # Express server entry point
├── routes/
│   └── reportRoutes.js      # API route definitions
├── controllers/
│   └── reportController.js  # Business logic
├── services/
│   ├── geminiService.js     # Gemini Vision API integration
│   ├── databaseService.js   # Supabase database operations
│   └── storageService.js    # Supabase storage operations
├── middleware/
│   └── authMiddleware.js    # JWT authentication
├── package.json             # Dependencies
└── .env.example            # Environment variables template
```

## 🚀 Features

- ✅ Google Gemini 1.5 Pro Vision API integration
- ✅ JWT authentication with Supabase
- ✅ Image upload with validation (JPEG/PNG, max 5MB)
- ✅ Automatic issue type detection
- ✅ Confidence scoring and severity assessment
- ✅ Rate limiting (100 req/15min)
- ✅ Comprehensive error handling
- ✅ Production-ready security (Helmet, CORS)
- ✅ Modular architecture
- ✅ Detailed logging

## 📋 Prerequisites

- Node.js >= 18.0.0
- Supabase account
- Google Gemini API key

## 🔧 Installation

### 1. Install Dependencies

```bash
cd api
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com

JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Setup Database

Run the migration in Supabase:

```bash
cd ..
supabase db push
```

Or manually execute `supabase/migrations/20260216000000_create_reports_table.sql` in Supabase SQL Editor.

### 4. Start Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## 📡 API Endpoints

### POST /api/report/analyze

Analyze uploaded image using Gemini Vision API.

**Authentication:** Required (JWT Bearer token)

**Request:**

```http
POST /api/report/analyze
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

Body:
- title: string (required)
- image: file (required, jpeg/png, max 5MB)
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "uuid",
    "title": "Broken streetlight on Main St",
    "image_url": "https://...",
    "analysis": {
      "issue_type": "Broken Streetlight",
      "description": "The image shows a non-functional streetlight...",
      "confidence_score": 95,
      "severity_level": "High",
      "priority_score": 4,
      "is_valid_issue": true,
      "recommended_authority": "Electrical Department"
    },
    "created_at": "2024-02-16T10:30:00Z"
  }
}
```

**Error Responses:**

```json
// 400 - Bad Request
{
  "success": false,
  "error": "Image file is required."
}

// 401 - Unauthorized
{
  "success": false,
  "error": "Invalid or expired token."
}

// 500 - Server Error
{
  "success": false,
  "error": "An unexpected error occurred. Please try again."
}

// 503 - Service Unavailable
{
  "success": false,
  "error": "AI analysis service temporarily unavailable."
}
```

## 🧪 Testing with cURL

```bash
# Get JWT token from Supabase (frontend login)
TOKEN="your-jwt-token"

# Test the endpoint
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Pothole on Main Street" \
  -F "image=@/path/to/image.jpg"
```

## 🧪 Testing with Postman

1. **Set Authorization:**
   - Type: Bearer Token
   - Token: `<your-jwt-token>`

2. **Set Request:**
   - Method: POST
   - URL: `http://localhost:3000/api/report/analyze`
   - Body: form-data
     - title: "Broken streetlight"
     - image: [Select file]

## 🔐 Security Features

### 1. JWT Authentication
- Validates JWT tokens from Supabase
- Extracts user_id from token payload
- Rejects invalid/expired tokens

### 2. Input Validation
- File type validation (JPEG/PNG only)
- File size limit (5MB max)
- Required field validation
- Sanitized database inputs

### 3. Rate Limiting
- 100 requests per 15 minutes per IP
- Prevents API abuse
- Configurable limits

### 4. Security Headers
- Helmet.js for security headers
- CORS configuration
- XSS protection

### 5. API Key Protection
- Environment variables only
- Never exposed to frontend
- Service-level Supabase key

## 🤖 Gemini Vision API

### System Prompt

The system uses a carefully crafted prompt to ensure consistent, structured responses:

```
You are an AI civic issue verification system.

Your tasks:
1. Analyze the uploaded image
2. Identify civic issue type
3. Determine if issue is genuine
4. Generate structured JSON response

Output format:
{
  "issue_type": "string",
  "confidence_score": 0-100,
  "is_valid_issue": true/false,
  "severity_level": "Low | Medium | High",
  "generated_description": "string",
  "recommended_authority": "string",
  "priority_score": 1-5
}
```

### Response Parsing

- Handles various response formats
- Removes markdown code blocks
- Validates response structure
- Provides fallback on failure

### Fallback Behavior

If Gemini API fails:
```json
{
  "issue_type": "Unclassified",
  "confidence_score": 0,
  "is_valid_issue": false,
  "severity_level": "Low",
  "generated_description": "Unable to analyze image automatically.",
  "recommended_authority": "General Services",
  "priority_score": 1
}
```

## 📊 Database Schema

### reports Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who created report |
| title | TEXT | Report title |
| image_url | TEXT | Supabase storage URL |
| issue_type | TEXT | AI-detected issue type |
| description | TEXT | AI-generated description |
| confidence_score | INTEGER | 0-100 confidence |
| severity_level | TEXT | Low/Medium/High |
| priority_score | INTEGER | 1-5 priority |
| is_valid_issue | BOOLEAN | AI validation |
| recommended_authority | TEXT | Suggested department |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### Indexes

- `idx_reports_user_id` - Fast user queries
- `idx_reports_created_at` - Sorting by date
- `idx_reports_issue_type` - Filter by type
- `idx_reports_severity_level` - Filter by severity

### Row Level Security (RLS)

- Users can only view/edit their own reports
- Admins can view all reports
- Secure by default

## 🗄️ Storage

### Bucket: report-images

- Public bucket for image access
- User-specific folders: `{user_id}/{uuid}.{ext}`
- Automatic cleanup on report deletion
- RLS policies for upload/delete

## 🔍 Error Handling

### Graceful Degradation

1. **Gemini API Failure:** Returns fallback response, allows submission
2. **Storage Failure:** Saves report without image URL
3. **Database Failure:** Returns error, prevents data loss

### Error Logging

All errors are logged with context:
```
❌ Error in analyzeReport controller: [error details]
```

## 📈 Performance

### Optimizations

- Memory-based file uploads (no disk I/O)
- Base64 conversion in-memory
- Database indexes for fast queries
- Connection pooling with Supabase

### Monitoring

- Request logging
- Error tracking
- Performance metrics
- Health check endpoint: `GET /health`

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd api
vercel
```

3. Set environment variables in Vercel dashboard

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables

Ensure all variables from `.env.example` are set in your deployment platform.

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Load Testing

```bash
npm run test:load
```

## 📝 Logging

### Log Levels

- 🚀 Server startup
- 📸 Image processing
- 🤖 Gemini API calls
- 💾 Database operations
- ✅ Success operations
- ❌ Error conditions

### Example Logs

```
🚀 Server running on port 3000
📸 Processing image analysis for user: abc-123
🤖 Sending image to Gemini API...
✅ Gemini analysis complete
☁️  Uploading image to storage...
💾 Saving report to database...
✅ Report saved successfully: xyz-789
```

## 🔧 Troubleshooting

### Common Issues

**1. "Invalid API key"**
- Check `GEMINI_API_KEY` in `.env`
- Verify key is active in Google AI Studio

**2. "Database connection failed"**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase project is active

**3. "JWT verification failed"**
- Ensure frontend sends valid Supabase JWT
- Check `JWT_SECRET` matches Supabase project

**4. "Rate limit exceeded"**
- Wait 15 minutes or adjust limits in `server.js`

## 📚 Additional Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/)
- [JWT Best Practices](https://jwt.io/introduction)

## 🤝 Support

For issues or questions:
1. Check logs for error details
2. Verify environment variables
3. Test with example requests
4. Review error responses

## 📄 License

MIT License - See LICENSE file for details
