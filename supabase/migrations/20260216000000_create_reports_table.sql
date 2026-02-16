-- Create reports table for Gemini Vision API analysis
-- This table stores AI-analyzed civic issue reports

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    severity_level TEXT NOT NULL CHECK (severity_level IN ('Low', 'Medium', 'High')),
    priority_score INTEGER NOT NULL CHECK (priority_score >= 1 AND priority_score <= 5),
    is_valid_issue BOOLEAN NOT NULL DEFAULT true,
    recommended_authority TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Create index on issue_type for filtering
CREATE INDEX IF NOT EXISTS idx_reports_issue_type ON public.reports(issue_type);

-- Create index on severity_level for filtering
CREATE INDEX IF NOT EXISTS idx_reports_severity_level ON public.reports(severity_level);

-- Enable Row Level Security
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
    ON public.reports
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own reports
CREATE POLICY "Users can insert own reports"
    ON public.reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reports
CREATE POLICY "Users can update own reports"
    ON public.reports
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete own reports"
    ON public.reports
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Admins can view all reports (optional - adjust role as needed)
CREATE POLICY "Admins can view all reports"
    ON public.reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload their own images
CREATE POLICY "Users can upload own images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'report-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Storage policy: Anyone can view images (public bucket)
CREATE POLICY "Anyone can view images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'report-images');

-- Storage policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'report-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.reports IS 'Stores AI-analyzed civic issue reports from Gemini Vision API';
