# Setup Instructions - Complete These Steps

Your backend server is running! ✅ Now complete these final setup steps:

## Step 1: Get Supabase Service Key (2 minutes)

1. Go to [Supabase Dashboard](https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/settings/api)
2. Scroll down to "Project API keys"
3. Copy the **service_role** key (secret key, not anon key)
4. Open `api/.env` and replace:
   ```
   SUPABASE_SERVICE_KEY=your-supabase-service-role-key-from-dashboard
   ```
   with your actual service key

## Step 2: Get JWT Secret (1 minute)

1. In the same Supabase Dashboard page (Settings > API)
2. Scroll down to "JWT Settings"
3. Copy the **JWT Secret**
4. Open `api/.env` and replace:
   ```
   JWT_SECRET=your-supabase-jwt-secret-from-dashboard
   ```
   with your actual JWT secret

## Step 3: Apply Database Migration (2 minutes)

### Option A: Using Supabase Dashboard (Recommended)

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/sql/new)
2. Open the file: `supabase/migrations/20260216000000_create_reports_table.sql`
3. Copy ALL the content
4. Paste into Supabase SQL Editor
5. Click "Run" button
6. You should see: "Success. No rows returned"

### Option B: Using Supabase CLI (if you have the password)

```bash
supabase db push
# Enter your database password when prompted
```

## Step 4: Restart Backend Server (30 seconds)

After updating the `.env` file:

1. Stop the current server (Ctrl+C in the terminal)
2. Restart it:
   ```bash
   npm run dev
   ```

## Step 5: Test the Backend (1 minute)

### Get a JWT Token

1. Open your frontend app (http://localhost:5173)
2. Sign in with your account
3. Open browser console (F12)
4. Run this command:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('JWT Token:', session.access_token);
   ```
5. Copy the token

### Test the API

```bash
# Replace YOUR_JWT_TOKEN with the token from above
# Replace test_image.jpg with an actual image file path

./test-endpoint.sh "YOUR_JWT_TOKEN" "path/to/test_image.jpg"
```

Or use curl:

```bash
curl -X POST http://localhost:3000/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test pothole issue" \
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
      "priority_score": 3,
      "is_valid_issue": true,
      "recommended_authority": "Public Works Department",
      "generated_description": "..."
    }
  }
}
```

## Troubleshooting

### "Invalid API key" Error
- Check that `GEMINI_API_KEY` in `api/.env` is correct
- Verify the key is active in [Google AI Studio](https://makersuite.google.com/app/apikey)

### "Database connection failed"
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Make sure you used the **service_role** key, not the anon key

### "JWT verification failed"
- Check that `JWT_SECRET` matches your Supabase project's JWT secret
- Make sure you're using a valid JWT token from Supabase auth

### "Table 'reports' does not exist"
- Run the migration SQL in Supabase Dashboard (Step 3)
- Verify the migration was successful

### Server won't start
- Check that port 3000 is not already in use
- Verify all dependencies are installed: `npm install`

## Quick Checklist

- [ ] Copied service_role key to `api/.env`
- [ ] Copied JWT secret to `api/.env`
- [ ] Ran migration SQL in Supabase Dashboard
- [ ] Restarted backend server
- [ ] Got JWT token from frontend
- [ ] Tested API endpoint successfully

## Next Steps

Once everything is working:

1. **Integrate with Frontend** - See `api/EXAMPLES.md` for React integration code
2. **Test Different Images** - Try various civic issue images
3. **Check Database** - View reports in Supabase Dashboard > Table Editor > reports
4. **Monitor Logs** - Watch the backend console for detailed logs

## Need Help?

- Check `api/README.md` for detailed documentation
- See `api/EXAMPLES.md` for 12+ test scenarios
- Review backend logs for error details

---

**Current Status:**
- ✅ Backend server running on port 3000
- ⏳ Waiting for Supabase keys in `.env`
- ⏳ Waiting for database migration
- ⏳ Ready to test

**Estimated Time to Complete:** 5-10 minutes
