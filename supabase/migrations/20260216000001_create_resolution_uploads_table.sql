-- Create resolution_uploads table for AI-powered verification
-- This table stores worker resolution submissions with AI verification results

CREATE TABLE IF NOT EXISTS public.resolution_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL,
    after_image_url TEXT NOT NULL,
    after_lat DOUBLE PRECISION,
    after_lng DOUBLE PRECISION,
    exif_lat DOUBLE PRECISION,
    exif_lng DOUBLE PRECISION,
    ai_verification_status TEXT NOT NULL CHECK (ai_verification_status IN ('pending', 'verified', 'suspicious')),
    ai_confidence_score INTEGER CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
    suspicion_reason TEXT,
    location_distance DOUBLE PRECISION,
    image_similarity INTEGER CHECK (image_similarity >= 0 AND image_similarity <= 100),
    same_location BOOLEAN,
    issue_resolved BOOLEAN,
    visual_similarity_score INTEGER CHECK (visual_similarity_score >= 0 AND visual_similarity_score <= 100),
    analysis_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resolution_uploads_report_id ON public.resolution_uploads(report_id);
CREATE INDEX IF NOT EXISTS idx_resolution_uploads_worker_id ON public.resolution_uploads(worker_id);
CREATE INDEX IF NOT EXISTS idx_resolution_uploads_status ON public.resolution_uploads(ai_verification_status);
CREATE INDEX IF NOT EXISTS idx_resolution_uploads_created_at ON public.resolution_uploads(created_at DESC);

-- Add status column to reports table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'resolved', 'suspicious', 'verified'));
    END IF;
END $$;

-- Add latitude and longitude columns to reports table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN latitude DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN longitude DOUBLE PRECISION;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.resolution_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own resolution uploads
CREATE POLICY "Workers can view own resolutions"
    ON public.resolution_uploads
    FOR SELECT
    USING (auth.uid() = worker_id);

-- Policy: Workers can insert their own resolution uploads
CREATE POLICY "Workers can insert own resolutions"
    ON public.resolution_uploads
    FOR INSERT
    WITH CHECK (auth.uid() = worker_id);

-- Policy: Admins can view all resolution uploads
CREATE POLICY "Admins can view all resolutions"
    ON public.resolution_uploads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'official')
        )
    );

-- Policy: Report creators can view resolutions for their reports
CREATE POLICY "Report creators can view resolutions"
    ON public.resolution_uploads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports
            WHERE reports.id = resolution_uploads.report_id
            AND reports.user_id = auth.uid()
        )
    );

-- Create storage bucket for resolution images
INSERT INTO storage.buckets (id, name, public)
VALUES ('resolution-images', 'resolution-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Workers can upload resolution images
CREATE POLICY "Workers can upload resolution images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'resolution-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policy: Anyone can view resolution images (public bucket)
CREATE POLICY "Anyone can view resolution images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'resolution-images');

-- Storage policy: Workers can delete their own resolution images
CREATE POLICY "Workers can delete own resolution images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'resolution-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resolution_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_resolution_uploads_updated_at
    BEFORE UPDATE ON public.resolution_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_resolution_uploads_updated_at();

-- Add comment to table
COMMENT ON TABLE public.resolution_uploads IS 'Stores worker resolution submissions with AI-powered verification results';

-- Add index on report status for filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
