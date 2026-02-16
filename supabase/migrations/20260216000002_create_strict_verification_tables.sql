-- Create tables for STRICT resolution verification system
-- Enhanced security with worker authentication and comprehensive logging

-- ========================================
-- Table: authorized_workers
-- ========================================

CREATE TABLE IF NOT EXISTS public.authorized_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('worker', 'supervisor', 'admin')),
    department TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_authorized_workers_email ON public.authorized_workers(email);
CREATE INDEX IF NOT EXISTS idx_authorized_workers_status ON public.authorized_workers(status);

-- ========================================
-- Table: security_logs
-- ========================================

CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
    worker_email TEXT NOT NULL,
    reason TEXT NOT NULL,
    suspicion_score INTEGER DEFAULT 0 CHECK (suspicion_score >= 0 AND suspicion_score <= 100),
    ip_address TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical', 'error')),
    event_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for security log queries
CREATE INDEX IF NOT EXISTS idx_security_logs_worker_email ON public.security_logs(worker_email);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_suspicion_score ON public.security_logs(suspicion_score DESC);

-- ========================================
-- Update resolution_uploads table
-- ========================================

-- Add new columns for strict verification
DO $$ 
BEGIN
    -- Add worker_email column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'worker_email'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN worker_email TEXT;
    END IF;
    
    -- Add worker_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'worker_id'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN worker_id UUID;
    END IF;
    
    -- Add live_lat column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'live_lat'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN live_lat DOUBLE PRECISION;
    END IF;
    
    -- Add live_lng column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'live_lng'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN live_lng DOUBLE PRECISION;
    END IF;
    
    -- Add exif_timestamp column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'exif_timestamp'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN exif_timestamp TEXT;
    END IF;
    
    -- Add exif_camera column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'exif_camera'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN exif_camera TEXT;
    END IF;
    
    -- Add ai_fake_detected column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'ai_fake_detected'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN ai_fake_detected BOOLEAN DEFAULT false;
    END IF;
    
    -- Add suspicion_score column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'resolution_uploads' AND column_name = 'suspicion_score'
    ) THEN
        ALTER TABLE public.resolution_uploads ADD COLUMN suspicion_score INTEGER DEFAULT 0 
        CHECK (suspicion_score >= 0 AND suspicion_score <= 100);
    END IF;
END $$;

-- Create index on worker_email
CREATE INDEX IF NOT EXISTS idx_resolution_uploads_worker_email ON public.resolution_uploads(worker_email);

-- ========================================
-- Row Level Security Policies
-- ========================================

-- Enable RLS on authorized_workers
ALTER TABLE public.authorized_workers ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all workers
CREATE POLICY "Admins can view all workers"
    ON public.authorized_workers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Workers can view their own record
CREATE POLICY "Workers can view own record"
    ON public.authorized_workers
    FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all security logs
CREATE POLICY "Admins can view all security logs"
    ON public.security_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: System can insert security logs (service key)
CREATE POLICY "System can insert security logs"
    ON public.security_logs
    FOR INSERT
    WITH CHECK (true);

-- ========================================
-- Functions and Triggers
-- ========================================

-- Function to update updated_at timestamp for authorized_workers
CREATE OR REPLACE FUNCTION update_authorized_workers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for authorized_workers
CREATE TRIGGER update_authorized_workers_updated_at
    BEFORE UPDATE ON public.authorized_workers
    FOR EACH ROW
    EXECUTE FUNCTION update_authorized_workers_updated_at();

-- ========================================
-- Sample Data (for testing)
-- ========================================

-- Insert sample authorized workers (REMOVE IN PRODUCTION)
INSERT INTO public.authorized_workers (email, name, role, department, status)
VALUES 
    ('worker1@example.com', 'John Worker', 'worker', 'Public Works', 'active'),
    ('worker2@example.com', 'Jane Worker', 'worker', 'Sanitation', 'active'),
    ('supervisor@example.com', 'Bob Supervisor', 'supervisor', 'Operations', 'active'),
    ('admin@example.com', 'Alice Admin', 'admin', 'Administration', 'active')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE public.authorized_workers IS 'Stores authorized workers who can submit resolutions';
COMMENT ON TABLE public.security_logs IS 'Logs suspicious attempts and security events';
COMMENT ON COLUMN public.resolution_uploads.worker_email IS 'Email of worker who submitted resolution';
COMMENT ON COLUMN public.resolution_uploads.suspicion_score IS 'Calculated suspicion score (0-100, higher = more suspicious)';
COMMENT ON COLUMN public.resolution_uploads.ai_fake_detected IS 'Whether AI detected fake/manipulated image';
