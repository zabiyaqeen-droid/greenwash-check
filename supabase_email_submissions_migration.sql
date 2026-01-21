-- Create email_submissions table
CREATE TABLE IF NOT EXISTS email_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  document_name VARCHAR(500),
  assessment_score INTEGER,
  risk_level VARCHAR(50),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(100),
  user_agent TEXT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_submissions_email ON email_submissions(email);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_email_submissions_submitted_at ON email_submissions(submitted_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE email_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access to email_submissions"
  ON email_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);
