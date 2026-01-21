# Multi-Prompt Parallel Architecture Design

## Overview

This document outlines the redesigned architecture for the greenwashing assessment system, based on research into best practices for multi-prompt parallel LLM architectures.

## Problem Statement

The current single-prompt approach fails to extract environmental claims from documents. Testing with the Aspen Sustainability Report (46 pages, 128 text chunks) returned 0 claims despite containing numerous obvious claims.

**Root Cause:** Single monolithic prompt is too complex and the AI is not recognizing claims properly despite having instructions.

## Research-Based Solution

Based on research from 5 key sources:
1. **Tyler Burleigh (Reddit)** - Multi-threaded prompt architecture with orthogonality concept (38% latency reduction)
2. **James Lee (Dev.to)** - LLM parallel processing with batch processing, semaphores, and retry logic
3. **Mirascope** - Prompt orchestration techniques including parallel execution
4. **Confident AI/G-Eval** - LLM-as-judge framework with chain-of-thought evaluation
5. **Microsoft Research/Claimify** - High-quality claim extraction methodology

## Architecture Design

### Phase 1: Claim Extraction (Sequential - Claimify-inspired)

A dedicated, focused prompt that ONLY extracts claims. No assessment, no scoring.

```typescript
interface ExtractedClaim {
  id: string;
  text: string;                    // Exact quote from document
  page: number;                    // Page reference
  section: string;                 // Section/header context
  category: ClaimCategory;         // Type of claim
  claimType: 'factual' | 'commitment' | 'comparison';
  vaguenessFlags: string[];        // Any vague terms identified
}

type ClaimCategory = 
  | 'carbon_emissions'
  | 'net_zero'
  | 'renewable_energy'
  | 'waste_reduction'
  | 'water_conservation'
  | 'biodiversity'
  | 'sustainable_sourcing'
  | 'certifications'
  | 'general_sustainability';
```

**Extraction Prompt Design (following Claimify principles):**
1. Focus ONLY on verifiable claims
2. Exclude opinions and aspirational statements
3. Preserve context (company, timeframe, scope)
4. Handle ambiguity by flagging vague terms
5. Decompose compound claims

### Phase 2: Parallel Subcategory Assessment (18 prompts - G-Eval inspired)

Each of the 18 subcategories gets its own dedicated prompt running in parallel.

**Subcategory Structure:**

| Principle | Subcategory ID | Subcategory Name |
|-----------|----------------|------------------|
| 1. Be Truthful | 1a | Literal Truth |
| 1. Be Truthful | 1b | General Impression |
| 1. Be Truthful | 1c | Material Disclosure |
| 2. Be Substantiated | 2a | Adequate Testing |
| 2. Be Substantiated | 2b | Recognized Methodology |
| 2. Be Substantiated | 2c | Third-Party Verification |
| 3. Be Specific About Comparisons | 3a | Clear Comparison Basis |
| 3. Be Specific About Comparisons | 3b | Extent of Difference |
| 3. Be Specific About Comparisons | 3c | Fair Comparisons |
| 4. Be Proportionate | 4a | Proportionate Claims |
| 4. Be Proportionate | 4b | Materiality |
| 4. Be Proportionate | 4c | No Cherry-Picking |
| 5. When in Doubt, Spell it Out | 5a | Avoid Vague Terms |
| 5. When in Doubt, Spell it Out | 5b | Scope Clarity |
| 5. When in Doubt, Spell it Out | 5c | Accessible Information |
| 6. Substantiate Future Claims | 6a | Concrete Plan |
| 6. Substantiate Future Claims | 6b | Interim Targets |
| 6. Substantiate Future Claims | 6c | Meaningful Steps |

**Each Subcategory Prompt follows G-Eval pattern:**

```typescript
interface SubcategoryAssessment {
  subcategoryId: string;
  score: number;                   // 0-100
  status: 'Compliant' | 'Needs Attention' | 'High Risk';
  findings: Finding[];
  recommendations: string[];
  evidenceUsed: Evidence[];
}

interface Finding {
  claimId: string;                 // Reference to extracted claim
  issue: string;                   // Description of the issue
  severity: 'High' | 'Medium' | 'Low';
}

interface Evidence {
  quote: string;
  pageReference: string;
  context: string;
}
```

### Phase 3: Aggregation (Sequential)

Combines all 18 subcategory scores with configurable weights.

```typescript
interface AggregatedResult {
  overallScore: number;            // Weighted average
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  executiveSummary: string;
  
  principleScores: PrincipleScore[];  // 6 principles
  subcategoryScores: SubcategoryScore[]; // 18 subcategories
  
  totalClaimsAnalyzed: number;
  keyStrengths: Strength[];
  criticalIssues: Issue[];
  
  legalRiskAssessment: {
    penaltyExposure: string;
    enforcementRisk: 'Low' | 'Medium' | 'High';
    priorityActions: string[];
  };
}
```

## Implementation Details

### Concurrency Control

```typescript
// Use semaphore pattern to limit concurrent API calls
const MAX_CONCURRENT_PROMPTS = 10;
const semaphore = new Semaphore(MAX_CONCURRENT_PROMPTS);

async function assessSubcategory(claims: ExtractedClaim[], subcategory: Subcategory): Promise<SubcategoryAssessment> {
  return semaphore.acquire(async () => {
    return executeWithRetry(() => callOpenAI(buildPrompt(claims, subcategory)), {
      maxRetries: 2,
      backoff: 'exponential'
    });
  });
}
```

### Retry Logic with Exponential Backoff

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; backoff: 'exponential' }
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === options.maxRetries) throw error;
      await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Parallel Execution with Fault Tolerance

```typescript
// Use Promise.allSettled for fault tolerance
const results = await Promise.allSettled(
  subcategories.map(sub => assessSubcategory(extractedClaims, sub))
);

// Handle partial failures gracefully
const successfulResults = results
  .filter((r): r is PromiseFulfilledResult<SubcategoryAssessment> => r.status === 'fulfilled')
  .map(r => r.value);

const failedSubcategories = results
  .map((r, i) => r.status === 'rejected' ? subcategories[i] : null)
  .filter(Boolean);

if (failedSubcategories.length > 0) {
  console.warn(`Failed to assess subcategories: ${failedSubcategories.map(s => s?.id).join(', ')}`);
}
```

### Timeout Configuration

```typescript
const TIMEOUT_CONFIG = {
  claimExtraction: 60000,      // 60 seconds for claim extraction
  subcategoryAssessment: 30000, // 30 seconds per subcategory
  aggregation: 45000            // 45 seconds for aggregation
};
```

## Prompt Templates

### Claim Extraction Prompt

```
You are an expert at extracting environmental and sustainability claims from corporate documents.

TASK: Extract ALL environmental and sustainability claims from the following document text.

WHAT TO EXTRACT:
- Emission reduction claims (carbon, GHG, CO2, methane)
- Net-zero or carbon neutral commitments
- Renewable energy usage or targets
- Recycling, waste reduction, circular economy claims
- Water conservation claims
- Biodiversity or nature-positive claims
- Sustainable sourcing claims
- ESG performance claims
- Percentage improvements or reductions
- Future commitments or targets with dates
- Certifications (ISO 14001, B Corp, LEED, etc.)
- Awards or recognition for sustainability

WHAT TO EXCLUDE:
- General company values without specific claims
- Aspirational statements without commitments
- Marketing language without measurable claims

FOR EACH CLAIM:
1. Quote the EXACT text
2. Note the page number
3. Identify the section/header
4. Categorize the claim type
5. Flag any vague or undefined terms

DOCUMENT TEXT:
{{document_text}}

Return JSON:
{
  "claims": [
    {
      "id": "claim_1",
      "text": "exact quote",
      "page": 1,
      "section": "section header",
      "category": "carbon_emissions|net_zero|renewable_energy|waste_reduction|water_conservation|biodiversity|sustainable_sourcing|certifications|general_sustainability",
      "claimType": "factual|commitment|comparison",
      "vaguenessFlags": ["any vague terms like 'sustainable', 'eco-friendly', etc."]
    }
  ],
  "totalClaimsFound": number,
  "documentCoverage": "brief summary of what topics the claims cover"
}
```

### Subcategory Assessment Prompt Template

```
You are an expert in Canadian environmental law, Bill C-59 greenwashing provisions, and the Competition Bureau's guidelines for environmental claims.

TASK: Assess the following environmental claims against ONE specific criterion.

CRITERION: {{subcategory_name}}
DESCRIPTION: {{subcategory_description}}

SCORING GUIDE:
- 90-100: Fully compliant, exemplary practices
- 75-89: Generally compliant with minor improvements needed
- 50-74: Needs attention, several issues identified
- 25-49: High risk, significant compliance gaps
- 0-24: Critical issues, likely non-compliant

EVALUATION STEPS:
1. Review each claim against this specific criterion
2. Identify any issues or concerns
3. Note supporting evidence or lack thereof
4. Consider the severity of any violations
5. Assign a score with detailed justification

CLAIMS TO EVALUATE:
{{extracted_claims_json}}

DOCUMENT CONTEXT:
{{relevant_document_sections}}

Return JSON:
{
  "subcategoryId": "{{subcategory_id}}",
  "score": number,
  "status": "Compliant|Needs Attention|High Risk",
  "rationale": "detailed explanation of the score",
  "findings": [
    {
      "claimId": "reference to claim",
      "issue": "description of the issue",
      "severity": "High|Medium|Low"
    }
  ],
  "recommendations": ["specific actionable recommendations"],
  "evidenceUsed": [
    {
      "quote": "supporting quote",
      "pageReference": "Page X",
      "context": "why this is relevant"
    }
  ]
}
```

## Performance Expectations

Based on research findings:
- **Latency Reduction:** ~38% compared to single monolithic prompt
- **Accuracy Improvement:** Higher due to focused, single-task prompts
- **Fault Tolerance:** Partial results available even if some prompts fail
- **Scalability:** Can adjust concurrency based on API limits

## Error Handling Strategy

1. **Claim Extraction Failure:** Return error, cannot proceed without claims
2. **Individual Subcategory Failure:** 
   - Retry with exponential backoff
   - If still fails, mark as "Unable to assess" with score of 50
   - Continue with other subcategories
3. **Aggregation Failure:**
   - Calculate simple averages from successful subcategories
   - Note which subcategories could not be assessed

## Monitoring & Logging

```typescript
interface AnalysisMetrics {
  documentId: string;
  totalDuration: number;
  claimExtractionDuration: number;
  claimsExtracted: number;
  subcategoryDurations: Record<string, number>;
  subcategoriesSucceeded: number;
  subcategoriesFailed: number;
  aggregationDuration: number;
  totalTokensUsed: number;
  estimatedCost: number;
}
```

## Next Steps

1. Implement the claim extraction prompt with Claimify principles
2. Create 18 individual subcategory assessment prompts
3. Implement parallel execution with concurrency control
4. Add retry logic and error handling
5. Implement aggregation logic with weighted scoring
6. Test against Aspen Sustainability Report
7. Deploy and verify

