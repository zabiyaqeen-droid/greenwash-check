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
  principle_id INTEGER NOT NULL,
  principle_name TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  subcategory_name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0,
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
  principle_scores JSONB DEFAULT '{}',
  findings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_results_user_idx ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS assessment_results_document_idx ON assessment_results(document_id);

-- Delete existing default prompts to replace with improved versions
DELETE FROM assessment_prompts WHERE user_id IS NULL;

-- Insert improved prompts based on Anti-Greenwash Charter and Competition Bureau guidelines
-- Principle 1: Be Truthful (Weight: 1.0)
INSERT INTO assessment_prompts (principle_id, principle_name, subcategory_id, subcategory_name, prompt_template, weight, is_default) VALUES
(1, 'Be Truthful', 'literal-accuracy', 'Literal Truth Assessment', 
'Evaluate whether the environmental claims in this document are literally true. For each claim identified:

**Factual Accuracy (0-25 points):**
- 21-25: All claims are verifiably accurate with no factual errors
- 16-20: Claims are mostly accurate with minor imprecisions that do not materially affect meaning
- 11-15: Some claims contain inaccuracies that could mislead but are not fundamentally false
- 6-10: Multiple claims contain significant inaccuracies
- 0-5: Claims contain demonstrably false statements

**Completeness of Information (0-25 points):**
- 21-25: All material information necessary for accurate understanding is included
- 16-20: Most material information is present; minor omissions do not affect overall accuracy
- 11-15: Some material information is omitted but core claims remain defensible
- 6-10: Significant material information is omitted, creating misleading impressions
- 0-5: Critical information is concealed or omitted, rendering claims deceptive

Per Competition Bureau guidance: Claims must be truthful in their literal meaning. Per Anti-Greenwash Charter: Transparency requires clear communication without concealing or omitting information.

Claim to evaluate: {{claim}}', 1.0, true),

(1, 'Be Truthful', 'general-impression', 'General Impression Assessment',
'Assess the general impression conveyed by the environmental claims, considering not just literal meaning but the overall message received by a reasonable consumer. Per Competition Bureau guidance, examine the entirety of the representation including words, phrases, text display, visual elements, and context.

**Alignment Between Literal Meaning and General Impression (0-25 points):**
- 21-25: General impression accurately reflects the literal claims; no exaggeration or minimisation
- 16-20: General impression is consistent with literal claims with only minor discrepancies
- 11-15: Some disconnect between literal claims and general impression; potential for consumer confusion
- 6-10: General impression significantly overstates environmental benefits compared to literal claims
- 0-5: General impression is materially misleading despite technically accurate literal statements

**Visual and Contextual Honesty (0-25 points):**
- 21-25: Imagery, colours, and design elements accurately represent environmental attributes; no misleading nature imagery or green colour schemes that overstate benefits
- 16-20: Visual elements are generally appropriate with minor concerns about implied benefits
- 11-15: Some visual elements may create impressions of greater environmental benefit than substantiated
- 6-10: Visual presentation creates materially misleading impressions about environmental performance
- 0-5: Imagery and design deliberately create false impressions of environmental responsibility

Per Anti-Greenwash Charter: Avoid using nature imagery that implies greater environmental benefits than can be substantiated. Ensure colours are used responsibly and are not misleading.

Claim to evaluate: {{claim}}', 1.0, true),

(1, 'Be Truthful', 'material-disclosure', 'Material Disclosure Assessment',
'Evaluate whether all material information necessary for consumers not to be deceived is included as an integral part of the representation. Per Competition Bureau guidance, material information is information that could influence consumer behaviour.

**Disclosure of Limitations and Qualifications (0-25 points):**
- 21-25: All limitations, qualifications, and conditions are clearly disclosed as integral parts of claims
- 16-20: Most limitations are disclosed; minor qualifications may be in fine print but are accessible
- 11-15: Some important limitations are disclosed but not prominently; reliance on disclaimers
- 6-10: Significant limitations are buried in fine print or not disclosed at all
- 0-5: Material limitations are concealed or actively hidden from consumers

**Negative Impact Disclosure (0-25 points):**
- 21-25: Any negative environmental impacts are transparently disclosed alongside positive claims
- 16-20: Most negative impacts are acknowledged; minor omissions do not materially affect understanding
- 11-15: Some negative impacts are omitted but overall picture is not fundamentally misleading
- 6-10: Significant negative impacts are omitted while positive aspects are emphasised
- 0-5: Material negative information is concealed while making positive environmental claims

Per Anti-Greenwash Charter: Honesty requires that actions match promises and that organisations do not conceal material information.

Claim to evaluate: {{claim}}', 1.0, true),

-- Principle 2: Be Substantiated (Weight: 1.2 - higher weight as core requirement)
(2, 'Be Substantiated', 'evidence-quality', 'Evidence Quality Assessment',
'Evaluate whether environmental claims about products are based on adequate and proper testing, and whether claims about business activities are based on adequate and proper substantiation in accordance with internationally recognised methodology.

**Testing/Substantiation Methodology (0-25 points):**
- 21-25: Claims are supported by rigorous testing/substantiation using internationally recognised methodologies (e.g., ISO standards, GHG Protocol, SBTi)
- 16-20: Claims are supported by credible testing/substantiation with minor methodological gaps
- 11-15: Some substantiation exists but methodology is not clearly internationally recognised
- 6-10: Limited substantiation with questionable or undisclosed methodology
- 0-5: No substantiation or testing evident; claims appear to be unsubstantiated assertions

**Third-Party Verification (0-25 points):**
- 21-25: Claims are verified by reputable, independent third-party auditors or certification bodies
- 16-20: Some third-party verification exists; verification body is credible
- 11-15: Self-reported data with some external review or industry-standard verification
- 6-10: Primarily self-reported without meaningful external verification
- 0-5: No verification; claims rely entirely on unverified self-reporting

Per Competition Bureau: Testing must be conducted BEFORE making claims, not after. Per Anti-Greenwash Charter: Accountability requires substantiating claims with accurate, regularly evaluated empirical evidence.

Claim to evaluate: {{claim}}', 1.2, true),

(2, 'Be Substantiated', 'data-currency', 'Data Currency and Relevance',
'Assess whether the evidence supporting environmental claims is current, relevant, and regularly evaluated as required by the Anti-Greenwash Charter Accountability standard.

**Data Currency (0-25 points):**
- 21-25: Data is current (within 12 months) and reporting period is clearly stated
- 16-20: Data is recent (within 24 months) with clear reporting boundaries
- 11-15: Data is somewhat dated (2-3 years) but still relevant to current operations
- 6-10: Data is outdated (3+ years) or reporting period is unclear
- 0-5: No dates provided or data is clearly obsolete

**Relevance to Claims Made (0-25 points):**
- 21-25: Evidence directly supports the specific claims made; clear connection between data and assertions
- 16-20: Evidence is relevant with clear connection to most claims
- 11-15: Evidence is somewhat related but connection to specific claims is unclear
- 6-10: Evidence is tangentially related; significant gaps between data and claims
- 0-5: Evidence does not support the claims made or is irrelevant

Per Anti-Greenwash Charter: Organisations must commit to sharing facts, figures and statements that can be checked.

Claim to evaluate: {{claim}}', 1.2, true),

(2, 'Be Substantiated', 'quantification', 'Quantification and Specificity',
'Evaluate whether environmental claims include specific, quantifiable metrics rather than vague assertions. Per the Anti-Greenwash Charter, organisations should share verifiable facts, figures, and statements that can be checked.

**Quantification of Claims (0-25 points):**
- 21-25: Claims include specific metrics (percentages, absolute numbers, units) with clear baselines and timeframes
- 16-20: Most claims are quantified with some metrics and timeframes
- 11-15: Some quantification exists but many claims remain qualitative
- 6-10: Limited quantification; primarily qualitative assertions
- 0-5: No quantification; entirely vague or aspirational language

**Verifiability (0-25 points):**
- 21-25: All claims can be independently verified through disclosed sources, methodologies, or public data
- 16-20: Most claims are verifiable; sources are generally accessible
- 11-15: Some claims are verifiable but others lack sufficient detail for verification
- 6-10: Limited verifiability; insufficient detail to confirm claims
- 0-5: Claims cannot be verified; no sources or methodology disclosed

Claim to evaluate: {{claim}}', 1.2, true),

-- Principle 3: Be Specific About Comparisons (Weight: 0.9)
(3, 'Be Specific About Comparisons', 'comparison-clarity', 'Comparison Clarity',
'Evaluate whether comparative environmental claims clearly specify what is being compared, including the basis of comparison and the extent of difference. Per the Anti-Greenwash Charter Fairness standard, comparisons must use fair, clear, and unambiguous language.

**Clarity of Comparison Basis (0-25 points):**
- 21-25: Comparisons clearly state what is being compared (e.g., previous version, competitor, industry average) with specific identification
- 16-20: Comparison basis is stated but could be more specific
- 11-15: Comparison basis is implied but not explicitly stated
- 6-10: Comparison basis is vague or ambiguous
- 0-5: No comparison basis provided; comparisons are meaningless or misleading

**Extent of Difference (0-25 points):**
- 21-25: Quantified difference is clearly stated with appropriate context (e.g., "30% less emissions compared to our 2020 baseline")
- 16-20: Difference is quantified but context could be clearer
- 11-15: Difference is stated qualitatively (e.g., "significantly better") without quantification
- 6-10: Difference is vaguely implied without meaningful specification
- 0-5: No indication of extent of difference; comparison is meaningless

Claim to evaluate: {{claim}}', 0.9, true),

(3, 'Be Specific About Comparisons', 'like-for-like', 'Like-for-Like Comparisons',
'Assess whether comparisons are made on a like-for-like basis, comparing equivalent products, services, or activities under equivalent conditions.

**Equivalence of Compared Items (0-25 points):**
- 21-25: Comparisons are between genuinely equivalent items (same category, function, scale)
- 16-20: Comparisons are generally equivalent with minor differences acknowledged
- 11-15: Some differences exist between compared items that may affect validity
- 6-10: Significant differences between compared items undermine comparison validity
- 0-5: Comparisons are between fundamentally different items; comparison is misleading

**Condition Equivalence (0-25 points):**
- 21-25: Comparisons are made under equivalent conditions (same methodology, timeframe, scope)
- 16-20: Conditions are generally equivalent with minor variations
- 11-15: Some condition differences exist that may affect comparison validity
- 6-10: Significant condition differences undermine comparison validity
- 0-5: Conditions are not equivalent; comparison is fundamentally unfair

Claim to evaluate: {{claim}}', 0.9, true),

(3, 'Be Specific About Comparisons', 'comparison-substantiation', 'Comparative Claim Substantiation',
'Evaluate whether comparative claims are substantiated with evidence that supports the specific comparison being made.

**Evidence for Comparison (0-25 points):**
- 21-25: Comparative claims are supported by specific evidence for both the subject and the comparator
- 16-20: Evidence supports the comparison with minor gaps
- 11-15: Some evidence exists but comparison substantiation is incomplete
- 6-10: Limited evidence for comparative claims
- 0-5: No evidence supports the comparative claims made

**Fairness of Comparison (0-25 points):**
- 21-25: Comparison is fair, balanced, and does not cherry-pick favourable metrics while ignoring unfavourable ones
- 16-20: Comparison is generally fair with minor concerns about metric selection
- 11-15: Some cherry-picking of favourable metrics is evident
- 6-10: Comparison appears selectively constructed to favour the claimant
- 0-5: Comparison is fundamentally unfair or deliberately misleading

Claim to evaluate: {{claim}}', 0.9, true),

-- Principle 4: Be Proportionate (Weight: 1.0)
(4, 'Be Proportionate', 'proportionality', 'Proportionality of Claims',
'Assess whether environmental claims are proportionate to actual environmental benefits, avoiding exaggeration of minor benefits or downplaying of negative impacts.

**Claim Proportionality (0-25 points):**
- 21-25: Claims accurately reflect the scale and significance of environmental benefits; no exaggeration
- 16-20: Claims are generally proportionate with minor tendency toward emphasis
- 11-15: Some claims overstate the significance of environmental benefits
- 6-10: Claims significantly exaggerate environmental benefits relative to actual impact
- 0-5: Claims grossly overstate environmental benefits; major exaggeration

**Context of Overall Impact (0-25 points):**
- 21-25: Environmental claims are presented in context of overall business/product environmental impact
- 16-20: Some context is provided for understanding relative significance
- 11-15: Limited context; claims may appear more significant than they are
- 6-10: No context provided; minor benefits presented as major achievements
- 0-5: Claims deliberately obscure overall environmental impact while highlighting minor positives

Per Competition Bureau: Small environmental benefits should not be marketed as big ones.

Claim to evaluate: {{claim}}', 1.0, true),

(4, 'Be Proportionate', 'scope-accuracy', 'Scope Accuracy',
'Evaluate whether claims accurately represent the scope of environmental benefits (e.g., whether claims apply to entire product/business or only specific aspects).

**Scope Clarity (0-25 points):**
- 21-25: Scope of claims is clearly defined (e.g., "packaging is recyclable" vs "product is eco-friendly")
- 16-20: Scope is generally clear with minor ambiguities
- 11-15: Scope is somewhat unclear; claims may be interpreted more broadly than intended
- 6-10: Scope is vague; claims could easily be misinterpreted
- 0-5: Scope is deliberately ambiguous to create impression of broader benefits

**Life Cycle Consideration (0-25 points):**
- 21-25: Claims consider full life cycle or clearly specify which life cycle stage they address
- 16-20: Most relevant life cycle stages are considered or specified
- 11-15: Some life cycle stages are addressed but others are ignored without acknowledgment
- 6-10: Claims focus on favourable life cycle stages while ignoring problematic ones
- 0-5: Claims ignore significant life cycle impacts while making broad environmental assertions

Claim to evaluate: {{claim}}', 1.0, true),

(4, 'Be Proportionate', 'materiality', 'Materiality Assessment',
'Assess whether the environmental benefits claimed are material and significant, or whether minor/trivial benefits are being presented as meaningful achievements.

**Materiality of Benefits (0-25 points):**
- 21-25: Claimed benefits are genuinely material and significant to environmental outcomes
- 16-20: Benefits are meaningful though not transformative
- 11-15: Benefits are modest but presented appropriately
- 6-10: Minor benefits are presented as more significant than warranted
- 0-5: Trivial or immaterial benefits are presented as major environmental achievements

**Industry Context (0-25 points):**
- 21-25: Claims are meaningful in context of industry standards and best practices
- 16-20: Claims represent genuine improvement relative to industry norms
- 11-15: Claims represent compliance with minimum standards presented as achievements
- 6-10: Claims represent standard industry practice presented as exceptional
- 0-5: Claims represent legally required minimums presented as voluntary environmental leadership

Claim to evaluate: {{claim}}', 1.0, true),

-- Principle 5: When in Doubt, Spell it Out (Weight: 1.1)
(5, 'When in Doubt, Spell it Out', 'language-clarity', 'Clarity of Language',
'Evaluate whether environmental claims use clear, specific language rather than vague terms that could be interpreted broadly. Per Competition Bureau guidance, vague claims like "eco-friendly" may convey impressions of broader benefits than can be substantiated.

**Specificity of Terminology (0-25 points):**
- 21-25: All environmental terms are specific and clearly defined (e.g., "made with 50% post-consumer recycled content" vs "eco-friendly")
- 16-20: Most terms are specific; occasional use of general terms is qualified
- 11-15: Mix of specific and vague terms; some definitions provided
- 6-10: Predominantly vague terminology with limited specificity
- 0-5: Entirely vague terms ("green," "natural," "eco-friendly") without definition or substantiation

**Definition of Terms (0-25 points):**
- 21-25: All environmental terms are clearly defined within the communication or linked to definitions
- 16-20: Most terms are defined or use widely understood standard definitions
- 11-15: Some terms are defined but others are left ambiguous
- 6-10: Few terms are defined; significant ambiguity exists
- 0-5: No definitions provided; terms are used without explanation

Per Anti-Greenwash Charter: Clearly define the green terms used. ISO 14021 explicitly prohibits vague claims like "eco-friendly" without substantiation.

Claim to evaluate: {{claim}}', 1.1, true),

(5, 'When in Doubt, Spell it Out', 'methodology-transparency', 'Transparency of Methodology',
'Assess whether the methodology behind environmental claims is transparently disclosed, allowing stakeholders to understand how conclusions were reached.

**Methodology Disclosure (0-25 points):**
- 21-25: Full methodology is disclosed including standards used, calculation methods, and assumptions
- 16-20: Methodology is substantially disclosed with minor gaps
- 11-15: Some methodology is disclosed but significant details are missing
- 6-10: Limited methodology disclosure; process is largely opaque
- 0-5: No methodology disclosed; claims appear as unsupported assertions

**Assumption Transparency (0-25 points):**
- 21-25: All key assumptions are clearly stated and justified
- 16-20: Most assumptions are disclosed with reasonable justification
- 11-15: Some assumptions are disclosed but others are implicit
- 6-10: Assumptions are largely undisclosed
- 0-5: No assumptions disclosed; methodology is entirely opaque

Per Anti-Greenwash Charter: Outline a clear editorial process and commit to regular reviews and effective governance.

Claim to evaluate: {{claim}}', 1.1, true),

(5, 'When in Doubt, Spell it Out', 'information-accessibility', 'Accessibility of Information',
'Evaluate whether supporting information for environmental claims is accessible to stakeholders who wish to verify or understand the claims better.

**Information Accessibility (0-25 points):**
- 21-25: Supporting documentation is publicly available and easily accessible (e.g., published reports, linked sources)
- 16-20: Supporting information is available upon request or through accessible channels
- 11-15: Some supporting information is available but access is limited
- 6-10: Supporting information is difficult to access or not publicly available
- 0-5: No supporting information is accessible; claims cannot be verified

**Stakeholder Communication (0-25 points):**
- 21-25: Clear channels exist for stakeholders to ask questions about environmental claims
- 16-20: Contact information is provided for environmental claim inquiries
- 11-15: General contact information exists but no specific environmental claim process
- 6-10: Limited ability for stakeholders to seek clarification
- 0-5: No mechanism for stakeholder engagement on environmental claims

Per Anti-Greenwash Charter: Commit to answering emails about green claims within ten working days.

Claim to evaluate: {{claim}}', 1.1, true),

-- Principle 6: Substantiate Future Claims (Weight: 1.1)
(6, 'Substantiate Future Claims', 'future-substantiation', 'Future Claim Substantiation',
'Evaluate whether claims about future environmental performance (e.g., net-zero commitments, carbon neutrality targets) are supported by adequate and proper substantiation in accordance with internationally recognised methodology.

**Plan Credibility (0-25 points):**
- 21-25: Future claims are supported by detailed, concrete plans with interim targets and clear milestones (e.g., SBTi-validated targets)
- 16-20: Plans exist with reasonable detail and some interim targets
- 11-15: General plans exist but lack specific interim targets or milestones
- 6-10: Vague intentions without concrete plans
- 0-5: No plan exists; future claims are aspirational statements without substance

**Methodology Alignment (0-25 points):**
- 21-25: Future claims are substantiated using internationally recognised methodologies (e.g., SBTi, GHG Protocol, ISO 14064)
- 16-20: Claims reference recognised methodologies with minor gaps
- 11-15: Some methodology is referenced but alignment is unclear
- 6-10: No recognised methodology is referenced
- 0-5: Claims contradict or ignore internationally recognised methodologies

Per Competition Bureau: Future environmental claims require substantiation of plans and progress.

Claim to evaluate: {{claim}}', 1.1, true),

(6, 'Substantiate Future Claims', 'progress-demonstration', 'Progress Demonstration',
'Assess whether meaningful steps are already underway to accomplish stated future environmental goals, as required by Competition Bureau guidance.

**Current Action Evidence (0-25 points):**
- 21-25: Clear evidence of meaningful actions already taken toward future goals (investments, operational changes, verified progress)
- 16-20: Some actions are underway with documented progress
- 11-15: Limited actions have been taken; progress is early-stage
- 6-10: Minimal evidence of current action toward stated goals
- 0-5: No evidence of current action; future claims are purely aspirational

**Progress Reporting (0-25 points):**
- 21-25: Regular, transparent progress reporting against stated targets with verified data
- 16-20: Progress is reported periodically with reasonable transparency
- 11-15: Some progress reporting exists but is infrequent or lacks detail
- 6-10: Limited progress reporting; accountability is unclear
- 0-5: No progress reporting; no mechanism for tracking achievement of future claims

Per Anti-Greenwash Charter: Commit to regular reviews and effective governance. Carry out quarterly internal audits.

Claim to evaluate: {{claim}}', 1.1, true),

(6, 'Substantiate Future Claims', 'feasibility-realism', 'Feasibility and Realism',
'Evaluate whether future environmental claims are realistic and achievable based on current technology, resources, and industry context.

**Technical Feasibility (0-25 points):**
- 21-25: Future claims are technically feasible with current or near-term technology and resources
- 16-20: Claims are feasible with reasonable assumptions about technology development
- 11-15: Claims require significant technological advancement or resource acquisition
- 6-10: Claims appear optimistic given current technology and resources
- 0-5: Claims appear unrealistic or rely on unproven/speculative technology

**Timeline Realism (0-25 points):**
- 21-25: Timelines are realistic based on industry benchmarks and organisational capacity
- 16-20: Timelines are ambitious but achievable with sustained effort
- 11-15: Timelines are optimistic and may require acceleration of current efforts
- 6-10: Timelines appear unrealistic given current progress and industry norms
- 0-5: Timelines are clearly unrealistic or no timeline is provided for future claims

Claim to evaluate: {{claim}}', 1.1, true);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your auth setup)
DROP POLICY IF EXISTS "Allow all access to document_chunks" ON document_chunks;
DROP POLICY IF EXISTS "Allow all access to assessment_prompts" ON assessment_prompts;
DROP POLICY IF EXISTS "Allow all access to assessment_results" ON assessment_results;

CREATE POLICY "Allow all access to document_chunks" ON document_chunks FOR ALL USING (true);
CREATE POLICY "Allow all access to assessment_prompts" ON assessment_prompts FOR ALL USING (true);
CREATE POLICY "Allow all access to assessment_results" ON assessment_results FOR ALL USING (true);
