import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { readFile, unlink, mkdir, rm, writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { getAssessmentPrompts, saveAssessmentResult, type AssessmentPrompt } from '$lib/supabase';
import {
  extractClaims,
  assessAllSubcategories,
  aggregateResults,
  type SubcategoryConfig,
  type ExtractedClaim
} from '$lib/multi-prompt-analysis';

const execAsync = promisify(exec);

// Lazy initialization of OpenAI client
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

interface VisionClaimResult {
  claims: ExtractedClaim[];
  pageRange: string;
}

// Download file from URL
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

// Convert dimensions to SubcategoryConfig array
function dimensionsToSubcategories(
  dimensions: any[], 
  customPrompts?: AssessmentPrompt[]
): SubcategoryConfig[] {
  const subcategories: SubcategoryConfig[] = [];
  
  for (const dim of dimensions) {
    if (dim.enabled === false) continue;
    
    const principleId = parseInt(dim.id.replace(/\D/g, '')) || subcategories.length + 1;
    
    for (const criterion of dim.criteria || []) {
      if (criterion.enabled === false) continue;
      
      const customPrompt = customPrompts?.find(p => p.subcategory_id === criterion.id);
      
      subcategories.push({
        id: criterion.id,
        name: criterion.name,
        principleId: principleId,
        principleName: dim.name,
        description: customPrompt?.prompt_template || criterion.description,
        weight: customPrompt?.weight ?? criterion.weight ?? 1.0
      });
    }
  }
  
  return subcategories;
}

// Extract claims from images using Vision API (Claimify-inspired)
async function extractClaimsFromImages(
  imagePaths: string[], 
  batchNumber: number, 
  pageStart: number
): Promise<VisionClaimResult> {
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
      claims: [],
      pageRange: `Pages ${pageStart}-${pageStart}`
    };
  }

  const systemPrompt = `You are an expert at extracting environmental and sustainability claims from corporate documents.

TASK: Extract ALL environmental and sustainability claims from these document pages.

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
- Any "eco-friendly", "green", "sustainable", "natural", "clean" claims
- Product packaging claims (recyclable, biodegradable, compostable)
- Carbon offset or carbon neutral claims
- Zero waste claims
- Ocean-safe or waterway-safe claims

WHAT TO EXCLUDE:
- General company values without specific claims
- Purely aspirational statements without any commitment
- Non-environmental business claims

FOR EACH CLAIM:
1. Quote the EXACT text from the document
2. Note the page number
3. Identify the section/header context
4. Categorize the claim type
5. Flag any vague or undefined terms

IMPORTANT: Even if a claim seems well-substantiated, EXTRACT IT. We need ALL claims for assessment.
Look at ALL text - headings, body text, bullet points, charts, infographics, tables, and captions.`;

  const userPrompt = `CAREFULLY ANALYZE these document pages (pages ${pageStart}-${pageStart + imagePaths.length - 1}).

YOU MUST:
1. READ ALL TEXT visible in these images
2. EXTRACT EVERY environmental, sustainability, or ESG-related claim
3. Include claims about emissions, energy, water, waste, biodiversity, social impact
4. Include any percentages, targets, or metrics mentioned
5. Include any certifications, awards, or third-party validations
6. Include any future commitments or net-zero pledges
7. Include product claims (recyclable, biodegradable, eco-friendly, etc.)

Return JSON:
{
  "claims": [
    {
      "id": "claim_1",
      "text": "exact quote from document",
      "page": <page number>,
      "section": "section header or context",
      "category": "carbon_emissions|net_zero|renewable_energy|waste_reduction|water_conservation|biodiversity|sustainable_sourcing|certifications|general_sustainability",
      "claimType": "factual|commitment|comparison",
      "vaguenessFlags": ["list any vague terms used like 'sustainable', 'eco-friendly', etc."]
    }
  ],
  "totalClaimsFound": <number>
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            ...imageContents
          ]
        }
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content);

    // Add batch prefix to claim IDs to ensure uniqueness
    const claims: ExtractedClaim[] = (result.claims || []).map((claim: any, idx: number) => ({
      ...claim,
      id: `batch${batchNumber}_claim_${idx + 1}`,
      page: claim.page || pageStart
    }));

    return {
      claims,
      pageRange: `Pages ${pageStart}-${pageStart + imagePaths.length - 1}`
    };
  } catch (error) {
    console.error(`Error extracting claims from batch ${batchNumber}:`, error);
    return {
      claims: [],
      pageRange: `Pages ${pageStart}-${pageStart + imagePaths.length - 1}`
    };
  }
}

// Format results for the frontend
function formatResultsForFrontend(
  result: any,
  fileName: string,
  totalPages: number,
  pagesAnalyzed: number,
  chunksProcessed: number,
  processingTime: number
): any {
  return {
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    executiveSummary: result.executiveSummary,
    totalClaimsAnalyzed: result.totalClaimsAnalyzed,
    principleScores: result.principleScores.map((ps: any) => ({
      id: ps.id.toString(),
      name: ps.name,
      principle: ps.principle,
      overallScore: ps.overallScore,
      status: ps.status,
      summary: ps.summary,
      subcategories: ps.subcategories.map((sub: any) => ({
        id: sub.subcategoryId,
        name: sub.subcategoryName,
        score: sub.score,
        status: sub.status,
        rationale: sub.rationale,
        weight: sub.weight,
        evidence: sub.evidenceUsed,
        recommendations: sub.recommendations
      }))
    })),
    keyStrengths: result.keyStrengths,
    criticalIssues: result.criticalIssues,
    legalRiskAssessment: result.legalRiskAssessment,
    metadata: {
      fileName,
      totalPages,
      pagesAnalyzed,
      chunksProcessed,
      processingTimeSeconds: processingTime,
      assessmentDate: new Date().toISOString(),
      framework: 'Competition Bureau 6 Principles + Bill C-59 (Multi-Prompt Vision Analysis)',
      analysisMetrics: result.metadata
    }
  };
}

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  let localFilePath: string | null = null;
  let tempDir: string | null = null;
  
  try {
    const body: AnalyzeRequest = await request.json();
    const { fileId, filePath, fileName, dimensions, userId } = body;

    console.log(`[VISION] Starting multi-prompt vision analysis of ${fileName}`);

    // Fetch custom prompts
    let customPrompts: AssessmentPrompt[] = [];
    try {
      customPrompts = await getAssessmentPrompts(userId);
      console.log(`[VISION] Loaded ${customPrompts.length} assessment prompts`);
    } catch (promptError) {
      console.warn('Could not load custom prompts:', promptError);
    }

    // Create temp directory
    tempDir = `/tmp/greenwash-vision-${fileId}`;
    await mkdir(tempDir, { recursive: true });
    
    localFilePath = join(tempDir, `document.pdf`);

    // Get the file
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      await downloadFile(filePath, localFilePath);
    } else if (filePath.startsWith('memory://')) {
      const memoryFileId = filePath.replace('memory://', '');
      const fileBuffer = getFileFromMemory(memoryFileId);
      if (!fileBuffer) {
        return json({ error: 'File not found in memory.' }, { status: 400 });
      }
      await writeFile(localFilePath, fileBuffer);
    } else if (existsSync(filePath)) {
      localFilePath = filePath;
    } else {
      return json({ error: 'File not found.' }, { status: 400 });
    }

    const totalPages = await getPdfPageCount(localFilePath);
    const pagesToProcess = Math.min(totalPages, 200);
    
    console.log(`[VISION] Document has ${totalPages} pages, processing ${pagesToProcess}`);

    // Create temp directory for images
    const imageDir = join(tempDir, 'images');
    await mkdir(imageDir, { recursive: true });

    // PHASE 1: Extract claims from all pages using Vision API
    console.log('[VISION] Phase 1: Extracting claims from document images (Claimify-inspired)...');
    const batchSize = 5;
    const allClaims: ExtractedClaim[] = [];
    let chunksProcessed = 0;
    
    for (let startPage = 1; startPage <= pagesToProcess; startPage += batchSize) {
      const endPage = Math.min(startPage + batchSize - 1, pagesToProcess);
      const batchNumber = Math.ceil(startPage / batchSize);
      
      console.log(`[VISION] Processing batch ${batchNumber}: pages ${startPage}-${endPage}`);

      const imagePaths = await convertPdfToImages(localFilePath, imageDir, startPage, endPage);
      
      if (imagePaths.length > 0) {
        const claimResult = await extractClaimsFromImages(imagePaths, batchNumber, startPage);
        allClaims.push(...claimResult.claims);
        chunksProcessed++;
        
        console.log(`[VISION] Batch ${batchNumber}: extracted ${claimResult.claims.length} claims`);
        
        // Clean up images after processing
        for (const imgPath of imagePaths) {
          try {
            await unlink(imgPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }

      // Small delay between batches to avoid rate limiting
      if (startPage + batchSize <= pagesToProcess) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[VISION] Total claims extracted: ${allClaims.length}`);

    // PHASE 2: Parallel subcategory assessment (G-Eval inspired)
    console.log('[VISION] Phase 2: Running parallel subcategory assessments (G-Eval inspired)...');
    const subcategories = dimensionsToSubcategories(dimensions, customPrompts);
    console.log(`[VISION] Assessing ${subcategories.length} subcategories in parallel`);

    // Build document context from claims
    const documentContext = allClaims
      .slice(0, 50)
      .map(c => `[Page ${c.page}] ${c.text}`)
      .join('\n');

    const subcategoryResults = await assessAllSubcategories(
      allClaims,
      subcategories,
      documentContext
    );
    
    const successCount = subcategoryResults.filter(r => !r.error).length;
    const failCount = subcategoryResults.filter(r => r.error).length;
    console.log(`[VISION] Subcategory assessments: ${successCount} succeeded, ${failCount} failed`);

    // PHASE 3: Aggregate results
    console.log('[VISION] Phase 3: Aggregating results...');
    const aggregatedResult = await aggregateResults(
      allClaims,
      subcategoryResults,
      subcategories
    );

    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[VISION] Analysis complete in ${processingTime} seconds`);
    console.log(`[VISION] Overall score: ${aggregatedResult.overallScore}`);

    // Format results for frontend
    const formattedResult = formatResultsForFrontend(
      aggregatedResult,
      fileName,
      totalPages,
      pagesToProcess,
      chunksProcessed,
      processingTime
    );

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

    // Save assessment result
    if (userId) {
      try {
        await saveAssessmentResult({
          user_id: userId,
          document_id: fileId,
          document_name: fileName,
          overall_score: formattedResult.overallScore || 0,
          risk_level: formattedResult.riskLevel || 'Unknown',
          principle_scores: formattedResult.principleScores || {},
          findings: formattedResult.criticalIssues || [],
          recommendations: formattedResult.legalRiskAssessment?.priorityActions || []
        });
      } catch (saveError) {
        console.warn('Could not save assessment result:', saveError);
      }
    }

    return json({
      success: true,
      analysisType: 'vision',
      assessment: formattedResult
    });

  } catch (error) {
    console.error('[VISION] Analysis error:', error);
    
    // Clean up on error
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    return json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};
