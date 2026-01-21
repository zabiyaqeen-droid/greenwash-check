-- Create users table for storing registered users
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  linkedin TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 1,
  is_admin BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS users_admin_idx ON users(is_admin);

-- Index for sorting by registration date
CREATE INDEX IF NOT EXISTS users_registered_at_idx ON users(registered_at DESC);

-- Create a table for tracking assessment jobs (for background processing)
CREATE TABLE IF NOT EXISTS assessment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_name TEXT,
  file_path TEXT, -- Path to the uploaded file for processing
  input_type TEXT DEFAULT 'document', -- document or text
  input_text TEXT, -- For text input mode
  analysis_mode TEXT DEFAULT 'hybrid', -- hybrid or vision
  email_address TEXT, -- Email to send report to when complete
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  current_step TEXT,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE -- When processing actually began
);

-- Index for user job lookups
CREATE INDEX IF NOT EXISTS assessment_jobs_user_idx ON assessment_jobs(user_id);
CREATE INDEX IF NOT EXISTS assessment_jobs_status_idx ON assessment_jobs(status);
CREATE INDEX IF NOT EXISTS assessment_jobs_document_idx ON assessment_jobs(document_id);
