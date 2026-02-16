# Complete Deployment Guide

## Overview

This guide covers deploying your complete civic issue reporting platform with:
- Gemini Vision API for image analysis
- AI-powered resolution verification
- Supabase backend
- React frontend

## Prerequisites

- [ ] Supabase account and project
- [ ] Google Gemini API key
- [ ] Vercel account (for deployment)
- [ ] Domain name (optional)

## Part 1: Database Setup

### 1. Apply All Migrations

Go to [Supabase SQL Editor](https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/sql/new)

Run these migrations in order:

**Migration 1: Reports Table**
```bash
# Copy content from:
supabase/migrations/20260216000000_create_reports_table.sql
# Paste and run in SQL Editor
```

**Migration 2: Resolution Uploads Table**
```bash
# Copy content from:
supabase/migrations/20260216000001_create_resolution_uploads_table.sql
# Paste and run in SQL Editor
```

### 2. Verify Tables Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reports', 'resolution_uploads');
```

Should return both tables.

### 3. Check Storage Buckets

Go to Storage section and verify these buckets exist:
- `report-images`
- `resolution-images`

If not, create them manually and set to public.

## Part 2: Backend Deployment

### Option A: Deploy to Vercel (Recommended)

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Configure for Deployment

Create `vercel.json` in `api/` folder:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### 3. Deploy

```bash
cd api
vercel
```

Follow prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **civic-issue-backend**
- Directory? **./api**

#### 4. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.vercel.app
JWT_SECRET=your-supabase-jwt-secret
SUPABASE_URL=https://vzqtjhoevvjxdgocnfju.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

#### 5. Redeploy

```bash
vercel --prod
```

Your backend is now live at: `https://civic-issue-backend.vercel.app`

### Option B: Deploy to Traditional Server

#### 1. Prepare Server

```bash
# SSH into your server
ssh user@your-server.com

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

#### 2. Upload Code

```bash
# On your local machine
cd api
tar -czf backend.tar.gz .
scp backend.tar.gz user@your-server.com:~/

# On server
mkdir -p ~/civic-backend
cd ~/civic-backend
tar -xzf ~/backend.tar.gz
```

#### 3. Install Dependencies

```bash
cd ~/civic-backend
npm ci --only=production
```

#### 4. Configure Environment

```bash
nano .env
```

Add all environment variables (same as Vercel).

#### 5. Start with PM2

```bash
pm2 start server.js --name civic-backend
pm2 save
pm2 startup
```

#### 6. Setup Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/civic-backend
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/civic-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Setup SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Part 3: Frontend Deployment

### 1. Update API URL

Update your frontend `.env`:

```bash
# .env.production
VITE_API_URL=https://civic-issue-backend.vercel.app
VITE_SUPABASE_URL=https://vzqtjhoevvjxdgocnfju.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-maps-key
```

### 2. Build Frontend

```bash
npm run build
```

### 3. Deploy to Vercel

```bash
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Part 4: Post-Deployment Configuration

### 1. Update CORS

Update backend `.env` with production frontend URL:

```
FRONTEND_URL=https://your-frontend.vercel.app
```

Redeploy backend.

### 2. Test Endpoints

```bash
# Health check
curl https://civic-issue-backend.vercel.app/health

# Test report analysis (with JWT token)
curl -X POST https://civic-issue-backend.vercel.app/api/report/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test issue" \
  -F "image=@test.jpg"
```

### 3. Monitor Logs

**Vercel:**
- Go to Vercel Dashboard → Your Project → Logs

**Traditional Server:**
```bash
pm2 logs civic-backend
```

### 4. Setup Monitoring

**Recommended tools:**
- Sentry for error tracking
- LogRocket for session replay
- Uptime Robot for uptime monitoring

## Part 5: Security Checklist

### Backend Security

- [ ] Environment variables set correctly
- [ ] JWT_SECRET is strong and unique
- [ ] SUPABASE_SERVICE_KEY is kept secret
- [ ] GEMINI_API_KEY is not exposed
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled
- [ ] Helmet security headers active
- [ ] HTTPS enabled

### Database Security

- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to frontend
- [ ] Storage buckets have proper policies
- [ ] Sensitive data encrypted

### Frontend Security

- [ ] API keys not in client-side code
- [ ] JWT tokens stored securely
- [ ] XSS protection enabled
- [ ] HTTPS enforced

## Part 6: Performance Optimization

### Backend

1. **Enable Caching**
```javascript
// Add to server.js
const cache = require('express-cache-middleware');
app.use(cache({ ttl: 300 })); // 5 minutes
```

2. **Compress Responses**
```javascript
const compression = require('compression');
app.use(compression());
```

3. **Database Indexes**
Already created in migrations ✓

### Frontend

1. **Code Splitting**
```typescript
// Use lazy loading
const UploadResolution = lazy(() => import('./components/UploadResolution'));
```

2. **Image Optimization**
- Use WebP format
- Implement lazy loading
- Compress images before upload

3. **CDN**
- Use Vercel's built-in CDN
- Or configure Cloudflare

## Part 7: Monitoring & Maintenance

### Health Checks

Set up automated health checks:

```bash
# Cron job to check health every 5 minutes
*/5 * * * * curl -f https://civic-issue-backend.vercel.app/health || echo "Backend down"
```

### Database Backups

Supabase automatically backs up your database. To create manual backup:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

### Log Rotation

**Traditional Server:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Update Strategy

1. **Backend Updates:**
   ```bash
   git pull
   npm install
   pm2 restart civic-backend
   ```

2. **Frontend Updates:**
   - Push to GitHub
   - Vercel auto-deploys

3. **Database Migrations:**
   - Test in development first
   - Apply to production during low-traffic hours
   - Keep backups

## Part 8: Scaling

### When to Scale

Monitor these metrics:
- Response time > 2 seconds
- CPU usage > 80%
- Memory usage > 80%
- Error rate > 1%

### Scaling Options

**Vercel:**
- Automatically scales
- Upgrade plan for more resources

**Traditional Server:**
1. **Vertical Scaling**
   - Upgrade server resources

2. **Horizontal Scaling**
   - Add more servers
   - Use load balancer
   - Configure PM2 cluster mode:
   ```bash
   pm2 start server.js -i max
   ```

### Database Scaling

Supabase handles scaling automatically. For heavy loads:
- Enable connection pooling
- Add read replicas
- Optimize queries

## Part 9: Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
cd api
npm install
```

**2. "Database connection failed"**
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY
- Verify network connectivity
- Check Supabase project status

**3. "Gemini API errors"**
- Verify GEMINI_API_KEY is correct
- Check API quota
- Monitor rate limits

**4. "CORS errors"**
- Update FRONTEND_URL in backend .env
- Redeploy backend

**5. "JWT verification failed"**
- Check JWT_SECRET matches Supabase
- Verify token is not expired
- Check token format

### Debug Mode

Enable debug logging:

```bash
# .env
NODE_ENV=development
DEBUG=*
```

### Support Resources

- Supabase Docs: https://supabase.com/docs
- Gemini API Docs: https://ai.google.dev/docs
- Vercel Docs: https://vercel.com/docs

## Part 10: Cost Estimation

### Monthly Costs (Estimated)

**Supabase:**
- Free tier: $0 (up to 500MB database, 1GB storage)
- Pro tier: $25/month (8GB database, 100GB storage)

**Gemini API:**
- Free tier: 60 requests/minute
- Paid: ~$0.001 per request

**Vercel:**
- Hobby: $0 (personal projects)
- Pro: $20/month (commercial use)

**Total Estimated:**
- Development: $0/month
- Production (small): $25-50/month
- Production (medium): $100-200/month

## Deployment Checklist

### Pre-Deployment
- [ ] All migrations applied
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Tests passing
- [ ] Documentation updated

### Deployment
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] CORS configured

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Error tracking enabled
- [ ] Performance optimized

### Testing
- [ ] API endpoints working
- [ ] Authentication working
- [ ] Image upload working
- [ ] Resolution verification working
- [ ] Error handling working

---

**Deployment Status:** Ready for production
**Estimated Time:** 2-3 hours
**Difficulty:** Intermediate

**Need Help?**
- Check logs for errors
- Review environment variables
- Test endpoints individually
- Contact support if needed
