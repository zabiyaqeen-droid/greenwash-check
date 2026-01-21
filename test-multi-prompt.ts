/**
 * Test script for the multi-prompt parallel analysis system
 * 
 * Usage: npx tsx test-multi-prompt.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import OpenAI from 'openai';

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI();

// ============================================
// Types (copied from multi-prompt-analysis.ts)
// ============================================

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

interface ExtractedClaim {
  id: string;
  text: string;
  page: number;
  section: string;
  category: ClaimCategory;
  claimType: 'factual' | 'commitment' | 'comparison';
  vaguenessFlags: string[];
}

interface SubcategoryConfig {
  id: string;
  name: string;
  principleId: number;
  principleName: string;
  description: string;
  weight: number;
}

// ============================================
// Semaphore for concurrency control
// ============================================

class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    if (this.permits > 0) {
      this.permits--;
      try {
        return await fn();
      } finally {
        this.release();
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        } finally {
          this.release();
        }
      });
    });
  }

  private release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

const apiSemaphore = new Semaphore(10);

// ============================================
// Retry Logic
// ============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries: number; operationName: string }
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[${options.operationName}] Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < options.maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[${options.operationName}] Retrying in ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============================================
// Extract text from PDF
// ============================================

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  console.log(`[PDF] Extracting text from ${pdfPath}...`);
  
  try {
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    console.log(`[PDF] Extracted ${stdout.length} characters`);
    return stdout;
  } catch (error) {
    console.error('[PDF] Error extracting text:', error);
    throw error;
  }
}

// ============================================
// Claim Extraction
// ============================================

const CLAIM_EXTRACTION_PROMPT = `You are an expert at extracting environmental and sustainability claims from corporate documents.

TASK: Extract ALL environmental and sustainability claims from the following document text.

WHAT TO EXTRACT (be thorough - extract EVERY claim you find):
- Emission reduction claims (carbon, GHG, CO2, methane, Scope 1/2/3)
- Net-zero or carbon neutral commitments
- Renewable energy usage or targets
- Recycling, waste reduction, circular economy claims
- Water conservation claims
- Biodiversity or nature-positive claims
- Sustainable sourcing claims
- ESG performance claims
- Percentage improvements or reductions
- Future commitments or targets with dates
- Certifications (ISO 14001, B Corp, LEED, SBTi, etc.)
- Awards or recognition for sustainability
- Environmental impact statements
- Climate-related disclosures
- Sustainability goals and targets

WHAT TO EXCLUDE:
- General company values without specific claims
- Purely aspirational statements without any commitment
- Non-environmental business claims

FOR EACH CLAIM:
1. Quote the EXACT text from the document
2. Note the page number if available
3. Identify the section/header context
4. Categorize the claim type
5. Flag any vague or undefined terms (like "sustainable", "eco-friendly", "green", "natural", "clean")

IMPORTANT: Even if a claim seems well-substantiated, EXTRACT IT. We need ALL claims for assessment.

DOCUMENT TEXT:
{{document_text}}

Return JSON:
{
  "claims": [
    {
      "id": "claim_1",
      "text": "exact quote from document",
      "page": 1,
      "section": "section header or context",
      "category": "carbon_emissions|net_zero|renewable_energy|waste_reduction|water_conservation|biodiversity|sustainable_sourcing|certifications|general_sustainability",
      "claimType": "factual|commitment|comparison",
      "vaguenessFlags": ["list any vague terms used"]
    }
  ],
  "totalClaimsFound": number,
  "documentCoverage": "brief summary of sustainability topics covered"
}`;

async function extractClaims(documentText: string): Promise<{ claims: ExtractedClaim[]; totalClaimsFound: number; documentCoverage: string }> {
  const startTime = Date.now();
  console.log('[ClaimExtraction] Starting claim extraction...');
  
  // Limit text to avoid token overflow
  const limitedText = documentText.slice(0, 100000);
  const prompt = CLAIM_EXTRACTION_PROMPT.replace('{{document_text}}', limitedText);
  
  try {
    const result = await executeWithRetry(
      async () => {
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting environmental and sustainability claims from corporate documents. Be thorough and extract ALL claims, even minor ones.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        });
        
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
      },
      { maxRetries: 2, operationName: 'ClaimExtraction' }
    );
    
    const duration = Date.now() - startTime;
    console.log(`[ClaimExtraction] Extracted ${result.claims?.length || 0} claims in ${duration}ms`);
    
    return {
      claims: result.claims || [],
      totalClaimsFound: result.totalClaimsFound || result.claims?.length || 0,
      documentCoverage: result.documentCoverage || 'Unknown'
    };
  } catch (error) {
    console.error('[ClaimExtraction] Failed:', error);
    return { claims: [], totalClaimsFound: 0, documentCoverage: 'Extraction failed' };
  }
}

// ============================================
// Subcategory Assessment
// ============================================

const SUBCATEGORIES: SubcategoryConfig[] = [
  { id: 'literal_accuracy', name: 'Literal Accuracy', principleId: 1, principleName: 'Principle 1: Be Truthful', description: 'The literal meaning of all environmental claims must be accurate and verifiable.', weight: 1.0 },
  { id: 'general_impression', name: 'General Impression', principleId: 1, principleName: 'Principle 1: Be Truthful', description: 'The overall impression created by environmental claims must match actual environmental performance.', weight: 1.0 },
  { id: 'no_exaggeration', name: 'No Exaggeration', principleId: 1, principleName: 'Principle 1: Be Truthful', description: 'Claims must not overstate environmental benefits or achievements.', weight: 1.0 },
  { id: 'adequate_testing', name: 'Adequate Testing', principleId: 2, principleName: 'Principle 2: Be Substantiated', description: 'Environmental claims must be based on adequate and proper testing conducted BEFORE the claim was made.', weight: 1.0 },
  { id: 'recognized_methodology', name: 'Recognized Methodology', principleId: 2, principleName: 'Principle 2: Be Substantiated', description: 'Business activity claims must use internationally recognized methodology such as GHG Protocol, ISO standards, or Science Based Targets.', weight: 1.0 },
  { id: 'third_party_verification', name: 'Third-Party Verification', principleId: 2, principleName: 'Principle 2: Be Substantiated', description: 'Where internationally recognized methodology requires third-party verification, such verification must be obtained.', weight: 1.0 },
  { id: 'comparison_basis', name: 'Clear Comparison Basis', principleId: 3, principleName: 'Principle 3: Be Specific About Comparisons', description: 'Comparative claims must clearly specify what is being compared.', weight: 1.0 },
  { id: 'extent_of_difference', name: 'Extent of Difference', principleId: 3, principleName: 'Principle 3: Be Specific About Comparisons', description: 'Claims must clearly state the extent of environmental difference or improvement.', weight: 1.0 },
  { id: 'fair_comparisons', name: 'Fair Comparisons', principleId: 3, principleName: 'Principle 3: Be Specific About Comparisons', description: 'Comparisons should be against relevant alternatives, not outdated products or cherry-picked competitors.', weight: 1.0 },
  { id: 'proportionate_claims', name: 'Proportionate Claims', principleId: 4, principleName: 'Principle 4: Be Proportionate', description: 'Environmental marketing should be proportionate to actual environmental benefit.', weight: 1.0 },
  { id: 'materiality', name: 'Materiality of Claims', principleId: 4, principleName: 'Principle 4: Be Proportionate', description: 'Claims should focus on material environmental improvements that make a meaningful difference.', weight: 1.0 },
  { id: 'no_cherry_picking', name: 'No Cherry-Picking', principleId: 4, principleName: 'Principle 4: Be Proportionate', description: 'Organizations should not highlight minor environmental positives while ignoring significant environmental negatives.', weight: 1.0 },
  { id: 'avoid_vague_terms', name: 'Avoid Vague Terms', principleId: 5, principleName: 'Principle 5: When in Doubt, Spell it Out', description: 'Avoid vague terms like "eco-friendly", "green", "sustainable" without specific substantiation.', weight: 1.0 },
  { id: 'scope_clarity', name: 'Scope Clarity', principleId: 5, principleName: 'Principle 5: When in Doubt, Spell it Out', description: 'Be transparent about whether environmental claims apply to the whole product/business or just part of it.', weight: 1.0 },
  { id: 'accessible_information', name: 'Accessible Information', principleId: 5, principleName: 'Principle 5: When in Doubt, Spell it Out', description: 'Supporting information and substantiation should be readily accessible to consumers.', weight: 1.0 },
  { id: 'concrete_plan', name: 'Concrete Plan', principleId: 6, principleName: 'Principle 6: Substantiate Future Claims', description: 'Net-zero and other future environmental commitments must be supported by a clear, concrete plan.', weight: 1.0 },
  { id: 'interim_targets', name: 'Interim Targets', principleId: 6, principleName: 'Principle 6: Substantiate Future Claims', description: 'Long-term environmental commitments should include interim targets and milestones.', weight: 1.0 },
  { id: 'meaningful_steps', name: 'Meaningful Steps Underway', principleId: 6, principleName: 'Principle 6: Substantiate Future Claims', description: 'Organizations making future environmental claims should demonstrate meaningful steps already underway.', weight: 1.0 }
];

async function assessSubcategory(
  subcategory: SubcategoryConfig,
  claims: ExtractedClaim[],
  documentContext: string
): Promise<any> {
  const startTime = Date.now();
  
  if (claims.length === 0) {
    return {
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      principleId: subcategory.principleId,
      principleName: subcategory.principleName,
      score: 50,
      status: 'Needs Attention',
      rationale: 'No environmental claims were extracted. Manual review recommended.',
      findings: [],
      recommendations: ['Manual review of document recommended'],
      evidenceUsed: [],
      weight: subcategory.weight,
      duration: Date.now() - startTime
    };
  }
  
  const claimsJson = JSON.stringify(claims.slice(0, 40), null, 2);
  
  const prompt = `You are an expert in Canadian environmental law, Bill C-59 greenwashing provisions, and the Competition Bureau's guidelines.

TASK: Assess the following environmental claims against ONE specific criterion.

PRINCIPLE: ${subcategory.principleName}
CRITERION: ${subcategory.name}
DESCRIPTION: ${subcategory.description}

SCORING GUIDE (0-100):
- 90-100: Fully compliant, exemplary practices
- 75-89: Generally compliant with minor improvements needed
- 50-74: Needs attention, several issues identified
- 25-49: High risk, significant compliance gaps
- 0-24: Critical issues, likely non-compliant

CLAIMS TO EVALUATE:
${claimsJson}

DOCUMENT CONTEXT:
${documentContext.slice(0, 2000)}

Return JSON:
{
  "subcategoryId": "${subcategory.id}",
  "subcategoryName": "${subcategory.name}",
  "principleId": ${subcategory.principleId},
  "principleName": "${subcategory.principleName}",
  "score": number,
  "status": "Compliant|Needs Attention|High Risk",
  "rationale": "detailed explanation",
  "findings": [{"claimId": "...", "issue": "...", "severity": "High|Medium|Low"}],
  "recommendations": ["..."],
  "evidenceUsed": [{"quote": "...", "pageReference": "...", "context": "..."}]
}`;

  try {
    const result = await apiSemaphore.acquire(async () => {
      return executeWithRetry(
        async () => {
          const response = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert in Canadian environmental law. Focus on assessing ${subcategory.name}.`
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 2000,
            response_format: { type: 'json_object' }
          });
          
          const content = response.choices[0]?.message?.content || '{}';
          return JSON.parse(content);
        },
        { maxRetries: 2, operationName: `Assess-${subcategory.id}` }
      );
    });
    
    const duration = Date.now() - startTime;
    console.log(`[${subcategory.id}] Score: ${result.score}, Duration: ${duration}ms`);
    
    return {
      ...result,
      weight: subcategory.weight,
      duration
    };
  } catch (error) {
    console.error(`[${subcategory.id}] Failed:`, error);
    return {
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      principleId: subcategory.principleId,
      principleName: subcategory.principleName,
      score: 50,
      status: 'Needs Attention',
      rationale: 'Assessment failed due to technical error.',
      findings: [],
      recommendations: ['Manual review recommended'],
      evidenceUsed: [],
      weight: subcategory.weight,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================
// Main Test Function
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('MULTI-PROMPT PARALLEL ANALYSIS TEST');
  console.log('='.repeat(60));
  
  const pdfPath = '/home/ubuntu/upload/reduced2024-Aspen-Sustainability-report(2).pdf';
  
  // Step 1: Extract text from PDF
  console.log('\n[STEP 1] Extracting text from PDF...');
  const documentText = await extractTextFromPdf(pdfPath);
  console.log(`Extracted ${documentText.length} characters`);
  
  // Step 2: Extract claims
  console.log('\n[STEP 2] Extracting environmental claims...');
  const claimResult = await extractClaims(documentText);
  console.log(`Found ${claimResult.claims.length} claims`);
  console.log(`Coverage: ${claimResult.documentCoverage}`);
  
  // Show first 5 claims
  console.log('\nFirst 5 claims:');
  for (const claim of claimResult.claims.slice(0, 5)) {
    console.log(`  - [${claim.category}] ${claim.text.slice(0, 100)}...`);
  }
  
  // Step 3: Parallel subcategory assessment
  console.log('\n[STEP 3] Assessing subcategories in parallel...');
  const startTime = Date.now();
  
  const promises = SUBCATEGORIES.map(sub => 
    assessSubcategory(sub, claimResult.claims, documentText.slice(0, 5000))
  );
  
  const results = await Promise.allSettled(promises);
  
  const assessmentDuration = Date.now() - startTime;
  console.log(`\nAssessment completed in ${assessmentDuration}ms`);
  
  // Step 4: Aggregate results
  console.log('\n[STEP 4] Aggregating results...');
  
  const subcategoryResults = results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    } else {
      return {
        subcategoryId: SUBCATEGORIES[i].id,
        subcategoryName: SUBCATEGORIES[i].name,
        principleId: SUBCATEGORIES[i].principleId,
        principleName: SUBCATEGORIES[i].principleName,
        score: 50,
        status: 'Needs Attention',
        rationale: 'Assessment failed',
        findings: [],
        recommendations: [],
        evidenceUsed: [],
        weight: 1.0,
        error: r.reason?.message
      };
    }
  });
  
  // Calculate principle scores
  const principleMap = new Map<number, any[]>();
  for (const result of subcategoryResults) {
    const existing = principleMap.get(result.principleId) || [];
    existing.push(result);
    principleMap.set(result.principleId, existing);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));
  
  let totalScore = 0;
  let principleCount = 0;
  
  for (const [principleId, subs] of principleMap) {
    const avgScore = Math.round(subs.reduce((sum, s) => sum + s.score, 0) / subs.length);
    totalScore += avgScore;
    principleCount++;
    
    console.log(`\n${subs[0].principleName}: ${avgScore}/100`);
    for (const sub of subs) {
      const status = sub.score >= 75 ? '✓' : sub.score >= 50 ? '⚠' : '✗';
      console.log(`  ${status} ${sub.subcategoryName}: ${sub.score}/100`);
    }
  }
  
  const overallScore = Math.round(totalScore / principleCount);
  const riskLevel = overallScore >= 75 ? 'Low Risk' : overallScore >= 50 ? 'Medium Risk' : 'High Risk';
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL SCORE: ${overallScore}/100`);
  console.log(`RISK LEVEL: ${riskLevel}`);
  console.log(`CLAIMS ANALYZED: ${claimResult.claims.length}`);
  console.log(`TOTAL DURATION: ${Date.now() - startTime}ms`);
  console.log('='.repeat(60));
  
  // Save results to file
  const outputPath = '/home/ubuntu/greenwash-check/test-results.json';
  await writeFile(outputPath, JSON.stringify({
    overallScore,
    riskLevel,
    totalClaimsAnalyzed: claimResult.claims.length,
    claims: claimResult.claims,
    subcategoryResults,
    metadata: {
      assessmentDuration,
      totalDuration: Date.now() - startTime
    }
  }, null, 2));
  
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);
