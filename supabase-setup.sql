-- Greenwash Check - Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing document chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for filtering by document
CREATE INDEX IF NOT EXISTS document_chunks_document_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_user_idx ON document_chunks(user_id);

-- Table for custom assessment prompts per subcategory
CREATE TABLE IF NOT EXISTS assessment_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  principle_id TEXT NOT NULL,
  principle_name TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  subcategory_name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for looking up prompts
CREATE INDEX IF NOT EXISTS assessment_prompts_user_idx ON assessment_prompts(user_id);
CREATE INDEX IF NOT EXISTS assessment_prompts_principle_idx ON assessment_prompts(principle_id);
CREATE INDEX IF NOT EXISTS assessment_prompts_subcategory_idx ON assessment_prompts(subcategory_id);

-- Table for storing assessment results
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  document_name TEXT,
  overall_score INTEGER,
  risk_level TEXT,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_results_user_idx ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS assessment_results_document_idx ON assessment_results(document_id);

-- Insert default prompts for all 18 subcategories
INSERT INTO assessment_prompts (principle_id, principle_name, subcategory_id, subcategory_name, prompt_template, is_default) VALUES
-- Principle 1: Be Truthful
('principle-1', 'Be Truthful', 'literal-accuracy', 'Literal Accuracy', 
'Evaluate whether this environmental claim is literally accurate and factually correct. Check if the specific numbers, percentages, dates, and statements can be verified. Look for any factual errors or misleading statistics.

Claim to evaluate: {{claim}}

Score 80-100 if the claim is factually accurate with verifiable data.
Score 50-79 if the claim has minor inaccuracies or unverified elements.
Score 0-49 if the claim contains significant factual errors or false statements.', true),

('principle-1', 'Be Truthful', 'general-impression', 'General Impression', 
'Assess the general impression this environmental claim creates in the mind of an ordinary consumer. Consider whether the overall message could mislead even if technically accurate. Evaluate the context, imagery, and presentation.

Claim to evaluate: {{claim}}

Score 80-100 if the general impression accurately reflects reality.
Score 50-79 if the impression could be somewhat misleading.
Score 0-49 if the impression is likely to deceive consumers.', true),

('principle-1', 'Be Truthful', 'no-exaggeration', 'No Exaggeration', 
'Determine if this environmental claim exaggerates benefits or downplays limitations. Look for superlatives, absolute statements, or claims that overstate environmental performance.

Claim to evaluate: {{claim}}

Score 80-100 if the claim is proportionate and not exaggerated.
Score 50-79 if there is minor exaggeration or missing context.
Score 0-49 if the claim significantly exaggerates environmental benefits.', true),

-- Principle 2: Be Substantiated
('principle-2', 'Be Substantiated', 'adequate-testing', 'Adequate Testing', 
'Evaluate whether this environmental claim is backed by adequate and proper testing conducted BEFORE the claim was made. Look for references to studies, data, or testing methodologies.

Claim to evaluate: {{claim}}

Score 80-100 if testing evidence is clearly referenced or available.
Score 50-79 if testing is implied but not clearly documented.
Score 0-49 if no testing evidence is provided or referenced.', true),

('principle-2', 'Be Substantiated', 'recognised-methodology', 'Recognised Methodology', 
'Assess whether the substantiation for this claim uses internationally recognised methodology (e.g., ISO standards, GHG Protocol, Science Based Targets). Check for methodology references.

Claim to evaluate: {{claim}}

Score 80-100 if recognised methodology is clearly stated.
Score 50-79 if methodology is mentioned but not clearly specified.
Score 0-49 if no recognised methodology is referenced.', true),

('principle-2', 'Be Substantiated', 'third-party-verification', 'Third-Party Verification', 
'Determine if this environmental claim has been verified by an independent third party. Look for audit statements, certifications, or external validation.

Claim to evaluate: {{claim}}

Score 80-100 if third-party verification is clearly documented.
Score 50-79 if some external review is mentioned but not detailed.
Score 0-49 if no third-party verification is evident.', true),

-- Principle 3: Be Specific About Comparisons
('principle-3', 'Be Specific About Comparisons', 'clear-comparison-basis', 'Clear Comparison Basis', 
'If this claim makes a comparison, evaluate whether the basis for comparison is clearly stated. Check if the baseline, timeframe, and comparison parameters are explicit.

Claim to evaluate: {{claim}}

Score 80-100 if comparison basis is clearly and completely stated.
Score 50-79 if comparison basis is partially stated or unclear.
Score 0-49 if comparison is made without clear basis.', true),

('principle-3', 'Be Specific About Comparisons', 'extent-of-difference', 'Extent of Difference', 
'Assess whether comparative claims clearly state the extent of the difference. Look for specific percentages, quantities, or measurable improvements.

Claim to evaluate: {{claim}}

Score 80-100 if the extent of difference is clearly quantified.
Score 50-79 if difference is mentioned but not precisely quantified.
Score 0-49 if vague comparative terms are used without specifics.', true),

('principle-3', 'Be Specific About Comparisons', 'fair-comparisons', 'Fair Comparisons', 
'Evaluate whether any comparisons made are fair and like-for-like. Check if the comparison is against relevant alternatives and not cherry-picked.

Claim to evaluate: {{claim}}

Score 80-100 if comparisons are fair and appropriate.
Score 50-79 if comparisons have some fairness concerns.
Score 0-49 if comparisons are unfair or misleading.', true),

-- Principle 4: Be Proportionate
('principle-4', 'Be Proportionate', 'proportionate-claims', 'Proportionate Claims', 
'Assess whether the prominence of this environmental claim is proportionate to the actual environmental benefit. Check if minor benefits are being over-emphasised.

Claim to evaluate: {{claim}}

Score 80-100 if claim prominence matches actual benefit.
Score 50-79 if claim is somewhat disproportionate to benefit.
Score 0-49 if minor benefits are significantly over-emphasised.', true),

('principle-4', 'Be Proportionate', 'materiality', 'Materiality', 
'Evaluate whether this environmental claim relates to a material aspect of the product or business. Check if the claim addresses significant environmental impacts.

Claim to evaluate: {{claim}}

Score 80-100 if claim addresses material environmental aspects.
Score 50-79 if materiality is questionable or unclear.
Score 0-49 if claim focuses on immaterial aspects while ignoring significant impacts.', true),

('principle-4', 'Be Proportionate', 'no-cherry-picking', 'No Cherry-Picking', 
'Determine if this claim cherry-picks positive environmental aspects while ignoring negative impacts. Look for balanced disclosure of environmental performance.

Claim to evaluate: {{claim}}

Score 80-100 if disclosure is balanced and comprehensive.
Score 50-79 if some relevant negative aspects are omitted.
Score 0-49 if significant negative impacts are hidden or ignored.', true),

-- Principle 5: When in Doubt, Spell it Out
('principle-5', 'When in Doubt, Spell it Out', 'avoid-vague-terms', 'Avoid Vague Terms', 
'Evaluate whether this claim uses vague or ambiguous terms like "eco-friendly", "green", "sustainable", or "natural" without clear definition or context.

Claim to evaluate: {{claim}}

Score 80-100 if terms are specific and well-defined.
Score 50-79 if some vague terms are used but with partial context.
Score 0-49 if vague, undefined environmental terms are prominent.', true),

('principle-5', 'When in Doubt, Spell it Out', 'scope-clarity', 'Scope Clarity', 
'Assess whether the scope and limitations of this environmental claim are clearly stated. Check if it is clear what the claim applies to (product, packaging, company, etc.).

Claim to evaluate: {{claim}}

Score 80-100 if scope is clearly and completely defined.
Score 50-79 if scope is partially defined or could be clearer.
Score 0-49 if scope is ambiguous or potentially misleading.', true),

('principle-5', 'When in Doubt, Spell it Out', 'accessible-information', 'Accessible Information', 
'Determine if supporting information for this claim is easily accessible to consumers. Check for links, references, or clear directions to substantiation.

Claim to evaluate: {{claim}}

Score 80-100 if supporting information is readily accessible.
Score 50-79 if information exists but is difficult to find.
Score 0-49 if no accessible supporting information is provided.', true),

-- Principle 6: Substantiate Future Claims
('principle-6', 'Substantiate Future Claims', 'concrete-plan', 'Concrete Plan', 
'If this is a forward-looking environmental claim (e.g., net-zero by 2050), evaluate whether there is a concrete, documented plan to achieve it.

Claim to evaluate: {{claim}}

Score 80-100 if a detailed, credible plan is documented.
Score 50-79 if a plan exists but lacks detail or credibility.
Score 0-49 if no concrete plan supports the future claim.', true),

('principle-6', 'Substantiate Future Claims', 'interim-targets', 'Interim Targets', 
'Assess whether future environmental commitments include interim targets and milestones. Look for short and medium-term goals that demonstrate progress.

Claim to evaluate: {{claim}}

Score 80-100 if clear interim targets are specified.
Score 50-79 if some milestones exist but are incomplete.
Score 0-49 if no interim targets support the long-term claim.', true),

('principle-6', 'Substantiate Future Claims', 'meaningful-steps', 'Meaningful Steps Underway', 
'Evaluate whether meaningful steps are already underway to achieve this future environmental commitment. Look for current actions and investments.

Claim to evaluate: {{claim}}

Score 80-100 if significant current actions are documented.
Score 50-79 if some actions are underway but limited.
Score 0-49 if no meaningful current steps are evident.', true);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your auth setup)
CREATE POLICY "Allow all access to document_chunks" ON document_chunks FOR ALL USING (true);
CREATE POLICY "Allow all access to assessment_prompts" ON assessment_prompts FOR ALL USING (true);
CREATE POLICY "Allow all access to assessment_results" ON assessment_results FOR ALL USING (true);
