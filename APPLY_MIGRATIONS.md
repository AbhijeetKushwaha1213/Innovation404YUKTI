# 🗄️ Database Migration Guide

## Quick Migration Steps

### Option 1: Copy-Paste Method (Recommended)

#### Step 1: Apply First Migration
1. Open: https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/sql/new
2. Open file: `supabase/migrations/20260216000001_create_resolution_uploads_table.sql`
3. Copy ALL content (Ctrl+A, Ctrl+C)
4. Paste in Supabase SQL Editor
5. Click "Run"
6. Wait for: "Success. No rows returned"

#### Step 2: Apply Second Migration
1. Open new tab: https://app.supabase.com/project/vzqtjhoevvjxdgocnfju/sql/new
2. Open file: `supabase/migrations/20260216000002_create_strict_verification_tables.sql`
3. Copy ALL content (Ctrl+A, Ctrl+C)
4. Paste in Supabase SQL Editor
5. Click "Run"
6. Wait for: "Success. No rows returned"

#### Step 3: Verify
Run this query in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('resolution_uploads', 'reports', 'authorized_workers', 'security_logs')
ORDER BY table_name;
```

Expected: 4 tables listed

---

## What Gets Created

### Migration 1: Resolution Uploads
- ✅ `resolution_uploads` table (stores verification attempts)
- ✅ Indexes for performance
- ✅ RLS policies for security
- ✅ Storage bucket for resolution images
- ✅ Adds `status`, `latitude`, `longitude` to `reports` table

### Migration 2: Strict Verification
- ✅ `authorized_workers` table (worker authentication)
- ✅ `security_logs` table (audit trail)
- ✅ Additional columns in `resolution_uploads`
- ✅ RLS policies
- ✅ Sample worker data (for testing)

---

## Tables Created

### 1. resolution_uploads
Stores all resolution verification attempts with AI analysis results.

**Columns:**
- `id` - UUID primary key
- `report_id` - Reference to original report
- `worker_id` - Worker who submitted
- `worker_email` - Worker email
- `after_image_url` - Resolution image URL
- `after_lat`, `after_lng` - Uploaded GPS coordinates
- `live_lat`, `live_lng` - Live GPS from device
- `exif_lat`, `exif_lng` - GPS from image EXIF
- `exif_timestamp` - Image capture time
- `exif_camera` - Camera model
- `ai_verification_status` - pending/verified/suspicious
- `ai_confidence_score` - 0-100
- `suspicion_reason` - Why flagged
- `suspicion_score` - 0-100 (higher = more suspicious)
- `location_distance` - Distance from original (meters)
- `image_similarity` - 0-100%
- `same_location` - Boolean
- `issue_resolved` - Boolean
- `ai_fake_detected` - Boolean
- `visual_similarity_score` - 0-100
- `analysis_summary` - AI analysis text
- `created_at`, `updated_at`

### 2. authorized_workers
Stores workers authorized to submit resolutions.

**Columns:**
- `id` - UUID primary key
- `email` - Worker email (unique)
- `name` - Worker name
- `role` - worker/supervisor/admin
- `department` - Department name
- `status` - active/inactive/suspended
- `created_at`, `updated_at`

**Sample Data Included:**
- worker1@example.com (John Worker)
- worker2@example.com (Jane Worker)
- supervisor@example.com (Bob Supervisor)
- admin@example.com (Alice Admin)

### 3. security_logs
Logs all suspicious attempts and security events.

**Columns:**
- `id` - UUID primary key
- `report_id` - Related report (if any)
- `worker_email` - Worker involved
- `reason` - Log reason
- `suspicion_score` - 0-100
- `ip_address` - Request IP
- `severity` - low/medium/high/critical/error
- `event_type` - Type of event
- `created_at`

### 4. reports (updated)
Existing table with new columns added:
- `status` - pending/resolved/suspicious/verified
- `latitude` - GPS latitude
- `longitude` - GPS longitude

---

## Verification Queries

### Check Tables Exist
```sql
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('resolution_uploads', 'authorized_workers', 'security_logs', 'reports')
ORDER BY table_name;
```

### Check Resolution Uploads Structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'resolution_uploads'
ORDER BY ordinal_position;
```

### Check Authorized Workers
```sql
SELECT email, name, role, status 
FROM authorized_workers
ORDER BY created_at;
```

### Check Storage Buckets
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('report-images', 'resolution-images');
```

### Check RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('resolution_uploads', 'authorized_workers', 'security_logs')
ORDER BY tablename, policyname;
```

---

## Troubleshooting

### Error: "relation already exists"
This is OK - it means the table was already created. The migrations use `IF NOT EXISTS` to be safe.

### Error: "column already exists"
This is OK - migrations check before adding columns.

### Error: "permission denied"
Make sure you're using the Supabase dashboard with admin access.

### Error: "syntax error"
Make sure you copied the ENTIRE file content, including all lines.

---

## After Migration

Once migrations are applied:

1. ✅ Start backend server: `cd api && npm run dev`
2. ✅ Test endpoints (see BACKEND_SETUP_COMPLETE.md)
3. ✅ Check logs for verification flow
4. ✅ Integrate with frontend

---

## Migration Files

- `supabase/migrations/20260216000001_create_resolution_uploads_table.sql` (150 lines)
- `supabase/migrations/20260216000002_create_strict_verification_tables.sql` (250 lines)

Total: ~400 lines of SQL

---

## Security Features Added

- ✅ Row Level Security (RLS) on all tables
- ✅ Worker authentication via email
- ✅ Audit logging for suspicious attempts
- ✅ Storage policies for image uploads
- ✅ Role-based access control
- ✅ Automatic timestamp tracking

---

## Next Steps

After applying migrations:
1. Start backend server
2. Test image analysis endpoint
3. Test verification endpoint
4. Check database for records
5. Review security logs
6. Integrate with frontend

See: `BACKEND_SETUP_COMPLETE.md` for detailed next steps.
