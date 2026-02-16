# Quick Start Guide - 5 Minutes Setup

## Step 1: Install Dependencies (1 min)

```bash
cd api
npm install
```

## Step 2: Get API Keys (2 min)

### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### Supabase Keys
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL
   - Service role key (secret)

## Step 3: Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
GEMINI_API_KEY=AIzaSy...your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key

# Optional (use defaults)
JWT_SECRET=your-jwt-secret-min-32-characters-long
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## Step 4: Setup Database (1 min)

Option A - Using Supabase CLI:
```bash
cd ..
supabase db push
```

Option B - Manual:
1. Go to Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/20260216000000_create_reports_table.sql`
3. Paste and run

## Step 5: Start Server (30 sec)

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📝 Environment: development
🔒 CORS enabled for: http://localhost:5173
```

## Step 6: Test It! (30 sec)

### Get JWT Token

Login to your frontend app, then in browser console:

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

### Test with cURL

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "title=Test pothole" \
  -F "image=@test_image.jpg"
```

### Expected Response

```json
{
  "success": true,
  "message": "Report analyzed and saved successfully.",
  "data": {
    "report_id": "...",
    "analysis": {
      "issue_type": "Pothole",
      "confidence_score": 85,
      "severity_level": "Medium",
      ...
    }
  }
}
```

## ✅ You're Done!

Your backend is now ready to analyze civic issues with AI!

## Next Steps

1. **Integrate with Frontend:** See `EXAMPLES.md` for React integration
2. **Deploy:** Follow deployment guide in `README.md`
3. **Monitor:** Check logs for any issues
4. **Customize:** Adjust system prompt in `services/geminiService.js`

## Troubleshooting

### "Invalid API key"
- Check `GEMINI_API_KEY` is correct
- Verify key is active in Google AI Studio

### "Database connection failed"
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase project is running

### "JWT verification failed"
- Use Supabase JWT token (not custom JWT)
- Token must be from authenticated user

### Port already in use
```bash
# Change PORT in .env
PORT=3001
```

## Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-16T10:30:00.000Z",
  "uptime": 123.45
}
```

## Need Help?

- Check `README.md` for detailed documentation
- See `EXAMPLES.md` for request/response examples
- Review logs for error details

---

**Total Setup Time:** ~5 minutes
**Difficulty:** Easy
**Prerequisites:** Node.js 18+, Supabase account, Gemini API key
