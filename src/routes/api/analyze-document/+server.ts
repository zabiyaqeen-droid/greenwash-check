import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { readFile, unlink, mkdir, rm, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { getAssessmentPrompts, storeDocumentChunks, saveAssessmentResult, type AssessmentPrompt } from '$lib/supabase';

const execAsync = promisify(exec);

// Lazy initialization of OpenAI client to avoid build-time errors
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// Access global uploaded files storage
declare global {
  var uploadedFiles: Map<string, { name: string; type: string; size: number; data: string }>;
}

interface AnalyzeRequest {
  fileId: string;
  filePath: string;
  fileName: string;
  dimensions: any[];
  userId?: string;
}

interface ClaimEvidence {
  quote: string;
  pageReference: string;
  context: string;
}

interface SubcategoryScore {
  id: string;
  name: string;
  score: number;
  status: 'Compliant' | 'Needs Attention' | 'High Risk';
  rationale: string;
  evidence: ClaimEvidence[];
  recommendations: string[];
}

interface PrincipleScore {
  id: string;
  name: string;
  principle: string;
  overallScore: number;
  status: 'Compliant' | 'Needs Attention' | 'High Risk';
  summary: string;
  subcategories: SubcategoryScore[];
}

interface ChunkResult {
  chunkId: number;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  claims: {
    text: string;
    type: string;
    page: number;
  }[];
  findings: {
    principle: string;
    subcategory: string;
    claim: string;
    assessment: string;
    severity: 'High' | 'Medium' | 'Low';
    page: number;
  }[];
}

// Download file from URL (Vercel Blob)
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destPath, Buffer.from(arrayBuffer));
}

// Get file from memory storage
function getFileFromMemory(fileId: string): Buffer | null {
  if (!globalThis.uploadedFiles) return null;
  const file = globalThis.uploadedFiles.get(fileId);
  if (!file) return null;
  return Buffer.from(file.data, 'base64');
}

// Convert PDF pages to images in batches
async function convertPdfToImages(pdfPath: string, outputDir: string, startPage: number, endPage: number): Promise<string[]> {
  const outputPrefix = join(outputDir, 'page');
  
  try {
    await execAsync(`pdftoppm -png -r 150 -f ${startPage} -l ${endPage} "${pdfPath}" "${outputPrefix}"`);
    const { stdout: lsOutput } = await execAsync(`ls -1 "${outputDir}"/page-*.png 2>/dev/null || true`);
    const imageFiles = lsOutput.trim().split('\n').filter(f => f.length > 0);
    return imageFiles.sort();
  } catch (error) {
    console.error('PDF conversion error:', error);
    return [];
  }
}

// Get total page count of PDF
async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    return parseInt(stdout.trim()) || 1;
  } catch (error) {
    console.error('Error getting page count:', error);
    return 1;
  }
}

// Build the detailed assessment framework prompt using custom prompts from Supabase
function buildAssessmentFramework(dimensions: any[], customPrompts?: AssessmentPrompt[]): string {
  const enabledDimensions = dimensions.filter((d: any) => d.enabled !== false);
  
  let framework = `COMPETITION BUREAU'S 6 PRINCIPLES FOR ENVIRONMENTAL CLAIMS:\n\n`;
  
  enabledDimensions.forEach((dim, idx) => {
    framework += `${idx + 1}. ${dim.name}\n`;
    framework += `   Core Principle: ${dim.principle || 'N/A'}\n`;
    framework += `   Legal Reference: ${dim.legalReference || 'N/A'}\n`;
    framework += `   Subcategories to assess:\n`;
    
const enabledCriteria = dim.criteria?.filter((c: any) => c.enabled !== false) || [];
      enabledCriteria.forEach((c: any) => {
        // Check if there's a custom prompt for this subcategory
        const customPrompt = customPrompts?.find(p => p.subcategory_id === c.id);
        const promptText = customPrompt?.prompt_template || c.description;
        const weight = customPrompt?.weight ?? c.weight ?? 1.0;
        
        framework += `   - ${c.name} (Weight: ${weight}x): ${promptText}\n`;
      });
    framework += `\n`;
  });
  
  return framework;
}

// Apply weighted scoring to the AI results based on prompt weights
function applyWeightedScoring(result: any, dimensions: any[], customPrompts?: AssessmentPrompt[]): any {
  if (!result || !result.principleScores) {
    return result;
  }

  // Build a weight map from custom prompts
  const weightMap: Record<string, number> = {};
  if (customPrompts) {
    for (const prompt of customPrompts) {
      weightMap[prompt.subcategory_id] = prompt.weight ?? 1.0;
    }
  }

  // Also get weights from dimensions if not in custom prompts
  for (const dim of dimensions) {
    if (dim.criteria) {
      for (const c of dim.criteria) {
        if (!weightMap[c.id]) {
          weightMap[c.id] = c.weight ?? 1.0;
        }
      }
    }
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Calculate weighted scores for each principle
  const updatedPrincipleScores = result.principleScores.map((principle: any) => {
    if (!principle.subcategories || principle.subcategories.length === 0) {
      // No subcategories, use principle score directly with weight 1.0
      totalWeightedScore += (principle.overallScore || 0) * 1.0;
      totalWeight += 1.0;
      return principle;
    }

    let principleWeightedScore = 0;
    let principleWeight = 0;

    const updatedSubcategories = principle.subcategories.map((sub: any) => {
      const weight = weightMap[sub.id] ?? 1.0;
      principleWeightedScore += (sub.score || 0) * weight;
      principleWeight += weight;
      return { ...sub, weight };
    });

    // Calculate weighted average for this principle
    const weightedPrincipleScore = principleWeight > 0 
      ? Math.round(principleWeightedScore / principleWeight) 
      : principle.overallScore || 0;

    totalWeightedScore += weightedPrincipleScore * (principleWeight / principle.subcategories.length);
    totalWeight += principleWeight / principle.subcategories.length;

    return {
      ...principle,
      overallScore: weightedPrincipleScore,
      subcategories: updatedSubcategories
    };
  });

  // Calculate overall weighted score
  const weightedOverallScore = totalWeight > 0 
    ? Math.round(totalWeightedScore / totalWeight) 
    : result.overallScore || 0;

  // Determine risk level based on weighted score
  let riskLevel = result.riskLevel;
  if (weightedOverallScore >= 75) {
    riskLevel = 'Low Risk';
  } else if (weightedOverallScore >= 50) {
    riskLevel = 'Medium Risk';
  } else {
    riskLevel = 'High Risk';
  }

  return {
    ...result,
    overallScore: weightedOverallScore,
    riskLevel,
    principleScores: updatedPrincipleScores
  };
}

// Analyze a batch of images with Vision API - extract claims and findings
async function analyzeImageBatch(imagePaths: string[], dimensions: any[], batchNumber: number, pageStart: number, customPrompts?: AssessmentPrompt[]): Promise<ChunkResult> {
  const framework = buildAssessmentFramework(dimensions, customPrompts);

  const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
  
  for (const imagePath of imagePaths.slice(0, 5)) {
    try {
      const imageBuffer = await readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      imageContents.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${base64Image}`,
          detail: 'high'
        }
      });
    } catch (error) {
      console.error(`Error reading image ${imagePath}:`, error);
    }
  }

  if (imageContents.length === 0) {
    return {
      chunkId: batchNumber,
      pageRange: `Pages ${pageStart}-${pageStart}`,
      pageStart,
      pageEnd: pageStart,
      claims: [],
      findings: []
    };
  }

  const systemPrompt = `You are an expert in Canadian environmental law, specifically Bill C-59's greenwashing provisions and the Competition Bureau's 6 Principles for Environmental Claims.

${framework}

LEGAL CONTEXT:
- Bill C-59 amended the Competition Act in June 2024
- Penalties: Up to $10M for individuals, $15M for corporations (or 3% of global revenue)
- Private right of action enabled June 2025 - individuals can now sue for greenwashing
- Both literal meaning AND general impression are assessed
- Claims must be substantiated BEFORE being made using internationally recognised methodology

CRITICAL INSTRUCTION - EXTRACT ALL CLAIMS:
You MUST extract EVERY environmental or sustainability-related claim from these pages. Look for:
- Emission reduction claims (carbon, GHG, CO2)
- Net-zero or carbon neutral commitments
- Renewable energy claims
- Recycling or waste reduction claims
- Water conservation claims
- Biodiversity or nature-positive claims
- Sustainable sourcing claims
- ESG performance claims
- Any percentage improvements mentioned
- Future commitments or targets
- Certifications mentioned (ISO, B Corp, etc.)
- Awards or recognition for sustainability

Even if a claim seems minor or well-substantiated, EXTRACT IT. We need to assess ALL claims.
If you see text about sustainability, environment, climate, emissions, or ESG - extract it as a claim.

SCORING METHODOLOGY:
You are scoring against the Competition Bureau's 6 Principles, each with 3 subcategories (18 total):

1. BE TRUTHFUL (Literal Accuracy, General Impression, No Exaggeration)
2. BE SUBSTANTIATED (Adequate Testing, Recognised Methodology, Third-Party Verification)
3. BE SPECIFIC ABOUT COMPARISONS (Clear Comparison Basis, Extent of Difference, Fair Comparisons)
4. BE PROPORTIONATE (Proportionate Claims, Materiality, No Cherry-Picking)
5. WHEN IN DOUBT, SPELL IT OUT (Avoid Vague Terms, Scope Clarity, Accessible Information)
6. SUBSTANTIATE FUTURE CLAIMS (Concrete Plan, Interim Targets, Meaningful Steps Underway)

SCORING SCALE:
- 80-100: COMPLIANT - Claims are well-substantiated and compliant with Competition Bureau guidelines
- 50-79: NEEDS IMPROVEMENT - Some claims may need additional substantiation or clarification
- 0-49: HIGH RISK - Significant compliance gaps identified, immediate attention recommended

YOUR TASK:
Analyze these document pages (pages ${pageStart}-${pageStart + imagePaths.length - 1}) and:

1. EXTRACT ALL ENVIRONMENTAL/SUSTAINABILITY CLAIMS - Include exact quotes and page numbers
2. ASSESS EACH CLAIM against ALL 6 Principles and their 18 subcategories
3. NOTE which specific principle AND subcategory each finding relates to
4. Provide EVIDENCE (exact quotes with page references) for each assessment

For each claim found, determine:
- Which principle(s) it relates to
- Which specific subcategory within that principle
- Whether it's compliant (80-100), needs attention (50-79), or high risk (0-49)
- The exact quote from the document
- The page number where it appears

Provide a JSON response:
{
  "claims": [
    {
      "text": "exact quote of the environmental claim",
      "type": "emission|recycling|sustainability|net-zero|carbon|water|energy|waste|biodiversity|other",
      "page": <page number where this appears>
    }
  ],
  "findings": [
    {
      "principle": "name of the principle (e.g., 'Principle 1: Be Truthful')",
      "subcategory": "name of the subcategory (e.g., 'Literal Accuracy')",
      "claim": "the exact claim or statement being assessed",
      "assessment": "detailed explanation of why this is compliant or problematic",
      "severity": "High|Medium|Low",
      "page": <page number>
    }
  ]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: `CAREFULLY ANALYZE these document pages. This appears to be a sustainability or ESG report.

YOU MUST:
1. READ ALL TEXT visible in these images
2. EXTRACT EVERY environmental, sustainability, or ESG-related claim
3. Include claims about emissions, energy, water, waste, biodiversity, social impact, governance
4. Include any percentages, targets, or metrics mentioned
5. Include any certifications, awards, or third-party validations
6. Include any future commitments or net-zero pledges

For EACH claim found, assess it against the Competition Bureau's 6 Principles.

IMPORTANT: A 46-page sustainability report should have MANY claims. If you're finding zero claims, look harder - check headings, infographics, charts, and body text.

Provide specific page references for each claim.` },
            ...imageContents
          ]
        }
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    return {
      chunkId: batchNumber,
      pageRange: `Pages ${pageStart}-${pageStart + imagePaths.length - 1}`,
      pageStart,
      pageEnd: pageStart + imagePaths.length - 1,
      claims: result.claims || [],
      findings: result.findings || []
    };
  } catch (error) {
    console.error(`Error analyzing batch ${batchNumber}:`, error);
    return {
      chunkId: batchNumber,
      pageRange: `Pages ${pageStart}-${pageStart + imagePaths.length - 1}`,
      pageStart,
      pageEnd: pageStart + imagePaths.length - 1,
      claims: [],
      findings: []
    };
  }
}

// Aggregate all chunk results into detailed principle and subcategory scores
async function aggregateResults(chunks: ChunkResult[], dimensions: any[], customPrompts?: AssessmentPrompt[]): Promise<any> {
  const allClaims = chunks.flatMap(c => c.claims);
  const allFindings = chunks.flatMap(c => c.findings);
  
  const enabledDimensions = dimensions.filter((d: any) => d.enabled !== false);

  // CRITICAL: If no claims were found in a sustainability report, this is a problem
  // Either the document wasn't read properly, or the AI failed to extract claims
  const noClaimsWarning = allClaims.length === 0 ? `

CRITICAL WARNING: No environmental claims were extracted from this document.
This is UNUSUAL for a sustainability report. Possible reasons:
1. The document may not contain environmental claims (unlikely for a sustainability report)
2. The document analysis may have failed to extract claims properly
3. The document may be image-heavy with text that couldn't be read

IF THIS IS A SUSTAINABILITY REPORT, you should:
- Score lower (50-70 range) due to inability to verify claims
- Note in rationale that claims could not be extracted for analysis
- Recommend manual review of the document
- Flag this as a limitation of the automated analysis

DO NOT give 100% scores when no claims were found - this indicates analysis failure, not compliance.` : '';

  // Build a detailed prompt for final aggregation
  const aggregationPrompt = `Based on analyzing a sustainability report, here are ALL the findings from ${chunks.length} sections:

TOTAL ENVIRONMENTAL CLAIMS FOUND: ${allClaims.length}
${allClaims.length > 0 ? JSON.stringify(allClaims.slice(0, 50), null, 2) : 'NO CLAIMS EXTRACTED - See warning below'}
${noClaimsWarning}

DETAILED FINDINGS BY PRINCIPLE (${allFindings.length} total):
${allFindings.length > 0 ? JSON.stringify(allFindings, null, 2) : 'NO FINDINGS EXTRACTED'}

Now provide a COMPREHENSIVE assessment scoring EACH of the 6 Principles AND EACH of their subcategories.

For EACH principle and subcategory, you MUST:
1. Provide a score (0-100 where 100 is fully compliant)
2. Explain the rationale with SPECIFIC EXAMPLES from the document
3. Include exact quotes and page references
4. Provide actionable recommendations for improvement

Return this EXACT JSON structure:
{
  "overallScore": <0-100>,
  "riskLevel": "Low Risk" | "Medium Risk" | "High Risk",
  "executiveSummary": "3-4 sentence summary of key findings",
  "totalClaimsAnalyzed": <number>,
  "principleScores": [
    ${enabledDimensions.map((d: any) => {
      const enabledCriteria = d.criteria?.filter((c: any) => c.enabled !== false) || [];
      return `{
      "id": "${d.id}",
      "name": "${d.name}",
      "principle": "${d.principle || ''}",
      "overallScore": <0-100>,
      "status": "Compliant" | "Needs Attention" | "High Risk",
      "summary": "2-3 sentence summary of findings for this principle",
      "subcategories": [
        ${enabledCriteria.map((c: any) => `{
          "id": "${c.id}",
          "name": "${c.name}",
          "score": <0-100>,
          "status": "Compliant" | "Needs Attention" | "High Risk",
          "rationale": "Detailed explanation of why this score was given, with specific examples from the document",
          "evidence": [
            {
              "quote": "exact quote from document",
              "pageReference": "Page X",
              "context": "brief context about this evidence"
            }
          ],
          "recommendations": ["specific actionable recommendation 1", "recommendation 2"]
        }`).join(',\n        ')}
      ]
    }`}).join(',\n    ')}
  ],
  "legalRiskAssessment": {
    "penaltyExposure": "potential penalty range",
    "enforcementRisk": "Low" | "Medium" | "High",
    "priorityActions": ["action 1", "action 2", "action 3"]
  },
  "keyStrengths": [
    {
      "title": "strength title",
      "description": "what was done well",
      "evidence": "quote or reference from document",
      "pageReference": "Page X"
    }
  ],
  "criticalIssues": [
    {
      "title": "issue title",
      "description": "what the problem is",
      "principle": "which principle this violates",
      "evidence": "problematic quote",
      "pageReference": "Page X",
      "recommendation": "how to fix it"
    }
  ]
}

IMPORTANT:
- Score each subcategory individually based on the evidence found
- If no evidence was found for a subcategory, note that and provide a neutral score with recommendation to add substantiation
- Always include page references for evidence
- Be specific in rationales - cite actual claims from the document
- Recommendations should be actionable and specific`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are an expert in Canadian environmental law and Bill C-59 greenwashing provisions. You work for Muuvment, a sustainability software company.

Your role is to provide comprehensive, detailed assessments that score EACH principle and EACH subcategory with specific evidence and page references.

CRITICAL REQUIREMENTS:
- Score EVERY principle (1-6) and EVERY subcategory within each principle
- Provide specific quotes and page references for all evidence
- Explain rationale for each score with concrete examples
- Give actionable, specific recommendations for improvement
- Reference the Competition Bureau's 6 Principles throughout` 
        },
        { role: 'user', content: aggregationPrompt }
      ],
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Aggregation error:', error);
    
    // Return a structured fallback response
    return {
      overallScore: 50,
      riskLevel: 'Medium Risk',
      executiveSummary: `Analysis of ${chunks.length} document sections completed with ${allClaims.length} environmental claims identified. Manual review recommended for detailed assessment.`,
      totalClaimsAnalyzed: allClaims.length,
      principleScores: enabledDimensions.map((d: any) => {
        const enabledCriteria = d.criteria?.filter((c: any) => c.enabled !== false) || [];
        return {
          id: d.id,
          name: d.name,
          principle: d.principle || '',
          overallScore: 50,
          status: 'Needs Attention',
          summary: 'Detailed analysis incomplete - manual review recommended',
          subcategories: enabledCriteria.map((c: any) => ({
            id: c.id,
            name: c.name,
            score: 50,
            status: 'Needs Attention',
            rationale: 'Unable to complete detailed analysis. Please review manually.',
            evidence: [],
            recommendations: ['Review this criterion manually against the document']
          }))
        };
      }),
      legalRiskAssessment: {
        penaltyExposure: 'Up to $10M (individuals) or $15M (corporations)',
        enforcementRisk: 'Medium',
        priorityActions: [
          'Review all environmental claims for substantiation',
          'Ensure claims are specific and not vague',
          'Document evidence supporting each claim'
        ]
      },
      keyStrengths: [],
      criticalIssues: allFindings.filter(f => f.severity === 'High').slice(0, 5).map((f, idx) => ({
        title: `Issue ${idx + 1}`,
        description: f.assessment,
        principle: f.principle,
        evidence: f.claim,
        pageReference: `Page ${f.page}`,
        recommendation: 'Review and address this issue'
      }))
    };
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  let localFilePath: string | null = null;
  
  try {
    const body: AnalyzeRequest = await request.json();
    const { fileId, filePath, fileName, dimensions, userId } = body;

    console.log(`Starting analysis of ${fileName}, storage path: ${filePath}`);

    // Fetch custom prompts from Supabase (user-specific or defaults)
    let customPrompts: AssessmentPrompt[] = [];
    try {
      customPrompts = await getAssessmentPrompts(userId);
      console.log(`Loaded ${customPrompts.length} assessment prompts${userId ? ' (including user customizations)' : ' (defaults)'}`);
    } catch (promptError) {
      console.warn('Could not load custom prompts, using defaults:', promptError);
    }

    // Create temp directory for processing
    const tempDir = `/tmp/greenwash-process-${fileId}`;
    await mkdir(tempDir, { recursive: true });
    
    localFilePath = join(tempDir, `document.pdf`);

    // Get the file based on storage type
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      console.log('Downloading from Vercel Blob...');
      await downloadFile(filePath, localFilePath);
    } else if (filePath.startsWith('memory://')) {
      console.log('Retrieving from memory storage...');
      const memoryFileId = filePath.replace('memory://', '');
      const fileBuffer = getFileFromMemory(memoryFileId);
      if (!fileBuffer) {
        return json({ error: 'File not found in memory. Please upload again.' }, { status: 400 });
      }
      await writeFile(localFilePath, fileBuffer);
    } else if (existsSync(filePath)) {
      console.log('Using local filesystem...');
      localFilePath = filePath;
    } else {
      return json({ error: 'File not found. Please upload again.' }, { status: 400 });
    }

    // Get total page count
    const totalPages = await getPdfPageCount(localFilePath);
    const pagesToProcess = Math.min(totalPages, 200);
    
    console.log(`Document has ${totalPages} pages, processing ${pagesToProcess}`);

    // Create temp directory for images
    const imageDir = join(tempDir, 'images');
    await mkdir(imageDir, { recursive: true });

    // Process in batches of 5 pages
    const batchSize = 5;
    const chunks: ChunkResult[] = [];
    
    for (let startPage = 1; startPage <= pagesToProcess; startPage += batchSize) {
      const endPage = Math.min(startPage + batchSize - 1, pagesToProcess);
      const batchNumber = Math.ceil(startPage / batchSize);
      
      console.log(`Processing batch ${batchNumber}: pages ${startPage}-${endPage}`);

      const imagePaths = await convertPdfToImages(localFilePath, imageDir, startPage, endPage);
      
      if (imagePaths.length > 0) {
        const chunkResult = await analyzeImageBatch(imagePaths, dimensions, batchNumber, startPage, customPrompts);
        chunks.push(chunkResult);
        
        // Clean up images after processing
        for (const imgPath of imagePaths) {
          try {
            await unlink(imgPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      // Small delay between batches
      if (startPage + batchSize <= pagesToProcess) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }

    // Clean up memory storage
    if (filePath.startsWith('memory://') && globalThis.uploadedFiles) {
      const memoryFileId = filePath.replace('memory://', '');
      globalThis.uploadedFiles.delete(memoryFileId);
    }

    if (chunks.length === 0) {
      return json({ error: 'No content could be extracted from the document' }, { status: 400 });
    }

    console.log(`Analyzed ${chunks.length} batches, aggregating results...`);

    const finalResult = await aggregateResults(chunks, dimensions, customPrompts);

    // Apply weighted score calculation
    const weightedResult = applyWeightedScoring(finalResult, dimensions, customPrompts);

    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`Analysis complete in ${processingTime} seconds`);

    // Save assessment result to Supabase for history tracking
    if (userId) {
      try {
        await saveAssessmentResult({
          user_id: userId,
          document_id: fileId,
          document_name: fileName,
          overall_score: weightedResult.overallScore || 0,
          risk_level: weightedResult.riskLevel || 'Unknown',
          principle_scores: weightedResult.principleScores || {},
          findings: weightedResult.criticalIssues || [],
          recommendations: weightedResult.legalRiskAssessment?.priorityActions || []
        });
        console.log('Assessment result saved to Supabase');
      } catch (saveError) {
        console.warn('Could not save assessment result:', saveError);
      }
    }

    return json({
      success: true,
      assessment: {
        ...weightedResult,
        metadata: {
          fileName,
          totalPages,
          pagesAnalyzed: pagesToProcess,
          chunksProcessed: chunks.length,
          processingTimeSeconds: processingTime,
          assessmentDate: new Date().toISOString(),
          framework: 'Competition Bureau 6 Principles + Bill C-59'
        }
      }
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }, { status: 500 });
  }
};
