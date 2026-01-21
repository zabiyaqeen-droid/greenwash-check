/**
 * Multi-Prompt Parallel Analysis System
 * 
 * Based on research best practices:
 * - Claimify (Microsoft Research) for claim extraction
 * - G-Eval for chain-of-thought evaluation
 * - Parallel execution with concurrency control
 */

import OpenAI from 'openai';
import { buildDetailedSubcategoryPrompt, SUBCATEGORY_PROMPTS } from './subcategory-prompts';

// Lazy initialization of OpenAI client
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// ============================================
// Types
// ============================================

export type ClaimCategory = 
  | 'carbon_emissions'
  | 'net_zero'
  | 'renewable_energy'
  | 'waste_reduction'
  | 'water_conservation'
  | 'biodiversity'
  | 'sustainable_sourcing'
  | 'certifications'
  | 'general_sustainability';

export interface ExtractedClaim {
  id: string;
  text: string;
  page: number;
  section: string;
  category: ClaimCategory;
  claimType: 'factual' | 'commitment' | 'comparison';
  vaguenessFlags: string[];
}

export interface ClaimExtractionResult {
  claims: ExtractedClaim[];
  totalClaimsFound: number;
  documentCoverage: string;
  extractionDuration: number;
}

export interface Finding {
  claimId: string;
  issue: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface Evidence {
  quote: string;
  pageReference: string;
  context: string;
}

export interface SubcategoryAssessment {
  subcategoryId: string;
  subcategoryName: string;
  principleId: number;
  principleName: string;
  score: number;
  status: 'Compliant' | 'Needs Attention' | 'High Risk';
  rationale: string;
  findings: Finding[];
  recommendations: string[];
  evidenceUsed: Evidence[];
  weight: number;
  duration: number;
  error?: string;
}

export interface SubcategoryConfig {
  id: string;
  name: string;
  principleId: number;
  principleName: string;
  description: string;
  weight: number;
  promptTemplate?: string;
}

export interface AggregatedResult {
  overallScore: number;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  executiveSummary: string;
  totalClaimsAnalyzed: number;
  principleScores: PrincipleScore[];
  keyStrengths: Strength[];
  criticalIssues: Issue[];
  legalRiskAssessment: {
    penaltyExposure: string;
    enforcementRisk: 'Low' | 'Medium' | 'High';
    priorityActions: string[];
  };
  metadata: {
    claimExtractionDuration: number;
    assessmentDuration: number;
    aggregationDuration: number;
    totalDuration: number;
    subcategoriesSucceeded: number;
    subcategoriesFailed: number;
  };
}

export interface PrincipleScore {
  id: number;
  name: string;
  principle: string;
  overallScore: number;
  status: 'Compliant' | 'Needs Attention' | 'High Risk';
  summary: string;
  subcategories: SubcategoryAssessment[];
}

export interface Strength {
  title: string;
  description: string;
  evidence: string;
  pageReference: string;
}

export interface Issue {
  title: string;
  description: string;
  principle: string;
  evidence: string;
  pageReference: string;
  recommendation: string;
  severity: 'High' | 'Medium' | 'Low';
}

// ============================================
// Concurrency Control (Semaphore Pattern)
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

// Global semaphore for API rate limiting
const apiSemaphore = new Semaphore(10);

// ============================================
// Retry Logic with Exponential Backoff
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
// Phase 1: Claim Extraction (Claimify-inspired)
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

export async function extractClaims(
  documentText: string,
  timeoutMs: number = 60000
): Promise<ClaimExtractionResult> {
  const startTime = Date.now();
  
  const prompt = CLAIM_EXTRACTION_PROMPT.replace('{{document_text}}', documentText);
  
  try {
    const result = await executeWithRetry(
      async () => {
        const response = await getOpenAIClient().chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at extracting environmental and sustainability claims from corporate documents. Be thorough and extract ALL claims, even minor ones.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000,
          response_format: { type: 'json_object' },
          timeout: timeoutMs
        });
        
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
      },
      { maxRetries: 2, operationName: 'ClaimExtraction' }
    );
    
    const duration = Date.now() - startTime;
    
    return {
      claims: result.claims || [],
      totalClaimsFound: result.totalClaimsFound || result.claims?.length || 0,
      documentCoverage: result.documentCoverage || 'Unknown',
      extractionDuration: duration
    };
  } catch (error) {
    console.error('[ClaimExtraction] Failed:', error);
    return {
      claims: [],
      totalClaimsFound: 0,
      documentCoverage: 'Extraction failed',
      extractionDuration: Date.now() - startTime
    };
  }
}

// ============================================
// Phase 2: Parallel Subcategory Assessment
// ============================================

function buildSubcategoryPrompt(
  subcategory: SubcategoryConfig,
  claims: ExtractedClaim[],
  documentContext: string
): string {
  // Try to use detailed prompt template if available
  const detailedPrompt = buildDetailedSubcategoryPrompt(subcategory.id, claims, documentContext);
  if (detailedPrompt) {
    return detailedPrompt;
  }
  
  // Fallback to generic prompt
  const claimsJson = JSON.stringify(claims.slice(0, 50), null, 2);
  
  return `You are an expert in Canadian environmental law, Bill C-59 greenwashing provisions, and the Competition Bureau's guidelines for environmental claims.

TASK: Assess the following environmental claims against ONE specific criterion.

PRINCIPLE: ${subcategory.principleName}
CRITERION: ${subcategory.name}
DESCRIPTION: ${subcategory.description}

SCORING GUIDE (0-100 scale):
- 90-100: Fully compliant, exemplary practices with strong evidence
- 75-89: Generally compliant with minor improvements needed
- 50-74: Needs attention, several issues identified
- 25-49: High risk, significant compliance gaps
- 0-24: Critical issues, likely non-compliant with Bill C-59

EVALUATION STEPS (Chain of Thought):
1. Review each claim against this specific criterion
2. Identify any issues or concerns related to ${subcategory.name}
3. Note supporting evidence or lack thereof
4. Consider the severity of any violations under Canadian law
5. Assign a score with detailed justification

CLAIMS TO EVALUATE:
${claimsJson}

ADDITIONAL DOCUMENT CONTEXT:
${documentContext.slice(0, 3000)}

Return JSON:
{
  "subcategoryId": "${subcategory.id}",
  "subcategoryName": "${subcategory.name}",
  "principleId": ${subcategory.principleId},
  "principleName": "${subcategory.principleName}",
  "score": number,
  "status": "Compliant|Needs Attention|High Risk",
  "rationale": "detailed explanation of the score with specific references to claims",
  "findings": [
    {
      "claimId": "reference to claim id",
      "issue": "description of the issue",
      "severity": "High|Medium|Low"
    }
  ],
  "recommendations": ["specific actionable recommendations"],
  "evidenceUsed": [
    {
      "quote": "supporting quote from claims",
      "pageReference": "Page X",
      "context": "why this is relevant"
    }
  ]
}`;
}

async function assessSubcategory(
  subcategory: SubcategoryConfig,
  claims: ExtractedClaim[],
  documentContext: string,
  timeoutMs: number = 30000
): Promise<SubcategoryAssessment> {
  const startTime = Date.now();
  
  // If no claims, return a default assessment
  if (claims.length === 0) {
    return {
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      principleId: subcategory.principleId,
      principleName: subcategory.principleName,
      score: 50,
      status: 'Needs Attention',
      rationale: 'No environmental claims were extracted from this document. Unable to assess compliance. Manual review recommended.',
      findings: [],
      recommendations: ['Manual review of document recommended', 'Ensure document contains extractable text'],
      evidenceUsed: [],
      weight: subcategory.weight,
      duration: Date.now() - startTime
    };
  }
  
  const prompt = buildSubcategoryPrompt(subcategory, claims, documentContext);
  
  try {
    const result = await apiSemaphore.acquire(async () => {
      return executeWithRetry(
        async () => {
          const response = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert in Canadian environmental law and Bill C-59 greenwashing provisions. Focus specifically on assessing ${subcategory.name} for the principle "${subcategory.principleName}".`
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 2000,
            response_format: { type: 'json_object' },
            timeout: timeoutMs
          });
          
          const content = response.choices[0]?.message?.content || '{}';
          return JSON.parse(content);
        },
        { maxRetries: 2, operationName: `Assess-${subcategory.id}` }
      );
    });
    
    return {
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      principleId: subcategory.principleId,
      principleName: subcategory.principleName,
      score: result.score ?? 50,
      status: result.status || 'Needs Attention',
      rationale: result.rationale || 'Assessment completed',
      findings: result.findings || [],
      recommendations: result.recommendations || [],
      evidenceUsed: result.evidenceUsed || [],
      weight: subcategory.weight,
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.error(`[Assess-${subcategory.id}] Failed:`, error);
    return {
      subcategoryId: subcategory.id,
      subcategoryName: subcategory.name,
      principleId: subcategory.principleId,
      principleName: subcategory.principleName,
      score: 50,
      status: 'Needs Attention',
      rationale: 'Assessment failed due to technical error. Manual review recommended.',
      findings: [],
      recommendations: ['Manual review recommended due to assessment error'],
      evidenceUsed: [],
      weight: subcategory.weight,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function assessAllSubcategories(
  subcategories: SubcategoryConfig[],
  claims: ExtractedClaim[],
  documentContext: string
): Promise<{ results: SubcategoryAssessment[]; succeeded: number; failed: number; duration: number }> {
  const startTime = Date.now();
  
  console.log(`[ParallelAssessment] Starting assessment of ${subcategories.length} subcategories with ${claims.length} claims`);
  
  // Execute all subcategory assessments in parallel with concurrency control
  const promises = subcategories.map(sub => 
    assessSubcategory(sub, claims, documentContext)
  );
  
  const settledResults = await Promise.allSettled(promises);
  
  const results: SubcategoryAssessment[] = [];
  let succeeded = 0;
  let failed = 0;
  
  for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i];
    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (!result.value.error) {
        succeeded++;
      } else {
        failed++;
      }
    } else {
      failed++;
      // Create a fallback result for rejected promises
      results.push({
        subcategoryId: subcategories[i].id,
        subcategoryName: subcategories[i].name,
        principleId: subcategories[i].principleId,
        principleName: subcategories[i].principleName,
        score: 50,
        status: 'Needs Attention',
        rationale: 'Assessment failed. Manual review recommended.',
        findings: [],
        recommendations: ['Manual review recommended'],
        evidenceUsed: [],
        weight: subcategories[i].weight,
        duration: 0,
        error: result.reason?.message || 'Unknown error'
      });
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[ParallelAssessment] Completed in ${duration}ms. Succeeded: ${succeeded}, Failed: ${failed}`);
  
  return { results, succeeded, failed, duration };
}

// ============================================
// Phase 3: Aggregation
// ============================================

export function aggregateResults(
  claims: ExtractedClaim[],
  subcategoryResults: SubcategoryAssessment[],
  claimExtractionDuration: number,
  assessmentDuration: number
): AggregatedResult {
  const startTime = Date.now();
  
  // Group subcategories by principle
  const principleMap = new Map<number, SubcategoryAssessment[]>();
  for (const result of subcategoryResults) {
    const existing = principleMap.get(result.principleId) || [];
    existing.push(result);
    principleMap.set(result.principleId, existing);
  }
  
  // Calculate principle scores with weighted averaging
  const principleScores: PrincipleScore[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const [principleId, subcategories] of principleMap) {
    let principleWeightedScore = 0;
    let principleWeight = 0;
    
    for (const sub of subcategories) {
      principleWeightedScore += sub.score * sub.weight;
      principleWeight += sub.weight;
    }
    
    const principleScore = principleWeight > 0 
      ? Math.round(principleWeightedScore / principleWeight) 
      : 50;
    
    totalWeightedScore += principleScore;
    totalWeight += 1;
    
    const principleName = subcategories[0]?.principleName || `Principle ${principleId}`;
    
    principleScores.push({
      id: principleId,
      name: principleName,
      principle: principleName,
      overallScore: principleScore,
      status: principleScore >= 75 ? 'Compliant' : principleScore >= 50 ? 'Needs Attention' : 'High Risk',
      summary: generatePrincipleSummary(subcategories),
      subcategories
    });
  }
  
  // Sort by principle ID
  principleScores.sort((a, b) => a.id - b.id);
  
  // Calculate overall score
  const overallScore = totalWeight > 0 
    ? Math.round(totalWeightedScore / totalWeight) 
    : 50;
  
  // Determine risk level
  const riskLevel = overallScore >= 75 ? 'Low Risk' : overallScore >= 50 ? 'Medium Risk' : 'High Risk';
  
  // Extract key strengths and critical issues
  const keyStrengths = extractStrengths(subcategoryResults, claims);
  const criticalIssues = extractCriticalIssues(subcategoryResults, claims);
  
  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    overallScore,
    riskLevel,
    claims.length,
    principleScores,
    criticalIssues
  );
  
  // Legal risk assessment
  const legalRiskAssessment = assessLegalRisk(overallScore, criticalIssues);
  
  const aggregationDuration = Date.now() - startTime;
  
  return {
    overallScore,
    riskLevel,
    executiveSummary,
    totalClaimsAnalyzed: claims.length,
    principleScores,
    keyStrengths,
    criticalIssues,
    legalRiskAssessment,
    metadata: {
      claimExtractionDuration,
      assessmentDuration,
      aggregationDuration,
      totalDuration: claimExtractionDuration + assessmentDuration + aggregationDuration,
      subcategoriesSucceeded: subcategoryResults.filter(r => !r.error).length,
      subcategoriesFailed: subcategoryResults.filter(r => r.error).length
    }
  };
}

function generatePrincipleSummary(subcategories: SubcategoryAssessment[]): string {
  const avgScore = subcategories.reduce((sum, s) => sum + s.score, 0) / subcategories.length;
  const issues = subcategories.flatMap(s => s.findings).filter(f => f.severity === 'High');
  
  if (avgScore >= 75) {
    return `Generally compliant with ${subcategories.length} subcategories assessed. ${issues.length} high-severity issues identified.`;
  } else if (avgScore >= 50) {
    return `Needs attention across ${subcategories.length} subcategories. ${issues.length} high-severity issues require immediate action.`;
  } else {
    return `High risk identified across ${subcategories.length} subcategories. ${issues.length} critical issues require urgent remediation.`;
  }
}

function extractStrengths(results: SubcategoryAssessment[], claims: ExtractedClaim[]): Strength[] {
  const strengths: Strength[] = [];
  
  // Find high-scoring subcategories
  const highScoring = results.filter(r => r.score >= 80).slice(0, 3);
  
  for (const result of highScoring) {
    if (result.evidenceUsed.length > 0) {
      strengths.push({
        title: `Strong ${result.subcategoryName}`,
        description: result.rationale.slice(0, 200),
        evidence: result.evidenceUsed[0]?.quote || '',
        pageReference: result.evidenceUsed[0]?.pageReference || ''
      });
    }
  }
  
  return strengths;
}

function extractCriticalIssues(results: SubcategoryAssessment[], claims: ExtractedClaim[]): Issue[] {
  const issues: Issue[] = [];
  
  for (const result of results) {
    const highSeverityFindings = result.findings.filter(f => f.severity === 'High');
    
    for (const finding of highSeverityFindings.slice(0, 2)) {
      const relatedClaim = claims.find(c => c.id === finding.claimId);
      
      issues.push({
        title: finding.issue.slice(0, 100),
        description: finding.issue,
        principle: result.principleName,
        evidence: relatedClaim?.text || '',
        pageReference: relatedClaim ? `Page ${relatedClaim.page}` : '',
        recommendation: result.recommendations[0] || 'Review and address this issue',
        severity: finding.severity
      });
    }
  }
  
  // Sort by severity and limit
  return issues.slice(0, 10);
}

function generateExecutiveSummary(
  overallScore: number,
  riskLevel: string,
  claimsCount: number,
  principleScores: PrincipleScore[],
  criticalIssues: Issue[]
): string {
  const lowScoringPrinciples = principleScores.filter(p => p.overallScore < 50);
  const highScoringPrinciples = principleScores.filter(p => p.overallScore >= 75);
  
  let summary = `This document was assessed against the Competition Bureau's 6 Principles for environmental claims, analyzing ${claimsCount} environmental claims. `;
  
  summary += `The overall compliance score is ${overallScore}/100, indicating ${riskLevel}. `;
  
  if (highScoringPrinciples.length > 0) {
    summary += `Strong compliance was found in ${highScoringPrinciples.map(p => p.name).join(', ')}. `;
  }
  
  if (lowScoringPrinciples.length > 0) {
    summary += `Areas requiring immediate attention include ${lowScoringPrinciples.map(p => p.name).join(', ')}. `;
  }
  
  if (criticalIssues.length > 0) {
    summary += `${criticalIssues.length} critical issues were identified that may expose the organization to enforcement action under Bill C-59.`;
  }
  
  return summary;
}

function assessLegalRisk(
  overallScore: number,
  criticalIssues: Issue[]
): { penaltyExposure: string; enforcementRisk: 'Low' | 'Medium' | 'High'; priorityActions: string[] } {
  const highSeverityCount = criticalIssues.filter(i => i.severity === 'High').length;
  
  let penaltyExposure: string;
  let enforcementRisk: 'Low' | 'Medium' | 'High';
  
  if (overallScore >= 75 && highSeverityCount === 0) {
    penaltyExposure = 'Low - No significant violations identified';
    enforcementRisk = 'Low';
  } else if (overallScore >= 50 || highSeverityCount <= 2) {
    penaltyExposure = 'Moderate - Potential for administrative penalties up to $10M for corporations';
    enforcementRisk = 'Medium';
  } else {
    penaltyExposure = 'High - Potential for significant penalties under Bill C-59, including up to $10M for corporations and $750K for individuals';
    enforcementRisk = 'High';
  }
  
  const priorityActions: string[] = [];
  
  if (highSeverityCount > 0) {
    priorityActions.push('Immediately review and revise high-risk environmental claims');
  }
  
  if (overallScore < 75) {
    priorityActions.push('Conduct comprehensive review of all environmental marketing materials');
    priorityActions.push('Ensure all claims are substantiated with adequate and proper testing');
  }
  
  if (overallScore < 50) {
    priorityActions.push('Engage legal counsel specializing in Canadian competition law');
    priorityActions.push('Consider voluntary disclosure to Competition Bureau if violations are identified');
  }
  
  priorityActions.push('Implement ongoing monitoring and compliance program for environmental claims');
  
  return { penaltyExposure, enforcementRisk, priorityActions: priorityActions.slice(0, 5) };
}

// ============================================
// Main Analysis Function
// ============================================

export async function runMultiPromptAnalysis(
  documentText: string,
  subcategories: SubcategoryConfig[],
  documentContext?: string
): Promise<AggregatedResult> {
  console.log('[MultiPromptAnalysis] Starting analysis...');
  
  // Phase 1: Extract claims
  console.log('[MultiPromptAnalysis] Phase 1: Extracting claims...');
  const claimResult = await extractClaims(documentText);
  console.log(`[MultiPromptAnalysis] Extracted ${claimResult.claims.length} claims in ${claimResult.extractionDuration}ms`);
  
  // Phase 2: Parallel subcategory assessment
  console.log('[MultiPromptAnalysis] Phase 2: Assessing subcategories in parallel...');
  const assessmentResult = await assessAllSubcategories(
    subcategories,
    claimResult.claims,
    documentContext || documentText.slice(0, 5000)
  );
  
  // Phase 3: Aggregate results
  console.log('[MultiPromptAnalysis] Phase 3: Aggregating results...');
  const aggregatedResult = aggregateResults(
    claimResult.claims,
    assessmentResult.results,
    claimResult.extractionDuration,
    assessmentResult.duration
  );
  
  console.log(`[MultiPromptAnalysis] Analysis complete. Overall score: ${aggregatedResult.overallScore}`);
  
  return aggregatedResult;
}
