import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { readFile, mkdir, rm, writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import { 
  getAssessmentPrompts, 
  saveAssessmentResult, 
  deleteDocumentChunks,
  type AssessmentPrompt 
} from '$lib/supabase';
import {
  extractTextWithPages,
  splitTextIntoChunks,
  storeChunksWithEmbeddings,
  detectVisualContent
} from '$lib/embeddings';
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

interface VisionAnalysisResult {
  visualClaims: Array<{
    description: string;
    type: 'chart' | 'graph' | 'infographic' | 'image' | 'table';
    page: number;
    claimsIdentified: string[];
    concerns: string[];
  }>;
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

// Get PDF page count
async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    return parseInt(stdout.trim()) || 1;
  } catch (error) {
    console.error('Error getting page count:', error);
    return 1;
  }
}

// Convert specific PDF pages to images for vision analysis
async function convertPagesToImages(pdfPath: string, outputDir: string, pages: number[]): Promise<Map<number, string>> {
  const pageImages = new Map<number, string>();
  
  for (const page of pages) {
    try {
      const outputPath = join(outputDir, `page-${page}.png`);
      await execAsync(`pdftoppm -png -r 150 -f ${page} -l ${page} "${pdfPath}" "${outputDir}/page"`);
      
      // pdftoppm adds padding to page numbers, find the actual file
      const { stdout } = await execAsync(`ls -1 "${outputDir}"/page-*.png 2>/dev/null | head -1`);
      const actualPath = stdout.trim();
      if (actualPath && existsSync(actualPath)) {
        pageImages.set(page, actualPath);
      }
    } catch (error) {
      console.warn(`Could not convert page ${page} to image:`, error);
    }
  }
  
  return pageImages;
}

// Analyze visual elements using Vision API
async function analyzeVisualElements(
  imagePaths: Map<number, string>,
  dimensions: any[],
  customPrompts?: AssessmentPrompt[]
): Promise<VisionAnalysisResult> {
  if (imagePaths.size === 0) {
    return { visualClaims: [] };
  }
  
  const visualClaims: VisionAnalysisResult['visualClaims'] = [];
  
  // Process images in batches
  const entries = Array.from(imagePaths.entries());
  const batchSize = 5;
  
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    const pageNumbers: number[] = [];
    
    for (const [pageNum, imagePath] of batch) {
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
        pageNumbers.push(pageNum);
      } catch (error) {
        console.warn(`Could not read image for page ${pageNum}`);
      }
    }
    
    if (imageContents.length === 0) continue;
    
    const prompt = `Analyze these pages from a sustainability report for VISUAL environmental claims.

Focus on:
1. Charts and graphs showing environmental metrics
2. Infographics about sustainability initiatives
3. Images that make implicit environmental claims
4. Tables with environmental data
5. Visual representations of carbon footprints, emissions, etc.

For each visual element containing environmental claims, identify:
- What type of visual it is
- What claims it makes (explicit or implicit)
- Any concerns about accuracy, substantiation, or misleading presentation

Return JSON:
{
  "visualClaims": [
    {
      "description": "description of the visual element",
      "type": "chart|graph|infographic|image|table",
      "page": <page number from ${JSON.stringify(pageNumbers)}>,
      "claimsIdentified": ["claim 1", "claim 2"],
      "concerns": ["concern about this visual"]
    }
  ]
}`;

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing visual sustainability communications for potential greenwashing. Focus on charts, graphs, and images that make environmental claims.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents
            ]
          }
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(content);
      
      if (result.visualClaims) {
        visualClaims.push(...result.visualClaims);
      }
    } catch (error) {
      console.error('Error analyzing visual elements:', error);
    }
  }
  
  return { visualClaims };
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

// Convert visual claims to ExtractedClaim format
function visualClaimsToExtractedClaims(visualClaims: VisionAnalysisResult['visualClaims']): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  let claimIndex = 1;
  
  for (const vc of visualClaims) {
    for (const claimText of vc.claimsIdentified) {
      claims.push({
        id: `visual_claim_${claimIndex++}`,
        text: claimText,
        page: vc.page,
        section: `Visual: ${vc.type}`,
        category: 'general_sustainability',
        claimType: 'factual',
        vaguenessFlags: []
      });
    }
  }
  
  return claims;
}

// Format results for the frontend
function formatResultsForFrontend(
  result: any,
  fileName: string,
  totalPages: number,
  pagesAnalyzed: number,
  textChunksCount: number,
  visualPagesAnalyzed: number,
  processingTime: number
): any {
  return {
    overallScore: result.overallScore,
    riskLevel: result.riskLevel,
    executiveSummary: result.executiveSummary,
    totalClaimsAnalyzed: result.totalClaimsAnalyzed,
    textClaimsCount: result.totalClaimsAnalyzed,
    visualClaimsCount: 0,
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
      textChunksProcessed: textChunksCount,
      visualPagesAnalyzed,
      processingTimeSeconds: processingTime,
      assessmentDate: new Date().toISOString(),
      framework: 'Competition Bureau 6 Principles + Bill C-59 (Multi-Prompt Hybrid Analysis)',
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

    console.log(`[HYBRID] Starting multi-prompt hybrid analysis of ${fileName}`);

    // Fetch custom prompts
    let customPrompts: AssessmentPrompt[] = [];
    try {
      customPrompts = await getAssessmentPrompts(userId);
      console.log(`[HYBRID] Loaded ${customPrompts.length} assessment prompts`);
    } catch (promptError) {
      console.warn('Could not load custom prompts:', promptError);
    }

    // Create temp directory
    tempDir = `/tmp/greenwash-hybrid-${fileId}`;
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
    
    console.log(`[HYBRID] Document has ${totalPages} pages, processing ${pagesToProcess}`);

    // Delete any existing chunks for this document
    await deleteDocumentChunks(fileId);
    
    // PHASE 1: Extract text from PDF
    console.log('[HYBRID] Phase 1: Extracting text from PDF...');
    const pagesWithText = await extractTextWithPages(localFilePath);
    const visualPages: number[] = [];
    const textChunks: Array<{ content: string; pageNumber: number; metadata: any }> = [];
    
    for (const { page, text } of pagesWithText) {
      // Check if page has visual content that needs Vision API
      if (detectVisualContent(text)) {
        visualPages.push(page);
      }
      
      // Split text into chunks
      const chunks = splitTextIntoChunks(text);
      for (const chunk of chunks) {
        textChunks.push({
          content: chunk,
          pageNumber: page,
          metadata: { hasVisualContent: detectVisualContent(text) }
        });
      }
    }
    
    console.log(`[HYBRID] Extracted ${textChunks.length} text chunks from ${pagesWithText.length} pages`);
    console.log(`[HYBRID] Found ${visualPages.length} pages with visual content`);
    
    // Store chunks with embeddings for future use
    if (textChunks.length > 0 && userId) {
      await storeChunksWithEmbeddings(fileId, userId, textChunks);
    }
    
    // Combine text for claim extraction
    const combinedText = textChunks
      .slice(0, 100) // Limit to first 100 chunks to stay within token limits
      .map(c => `[Page ${c.pageNumber || 'N/A'}]\n${c.content}`)
      .join('\n\n---\n\n');
    
    // PHASE 2: Extract claims using dedicated Claimify-inspired prompt
    console.log('[HYBRID] Phase 2: Extracting environmental claims (Claimify-inspired)...');
    const claimExtractionResult = await extractClaims(combinedText, 90000);
    console.log(`[HYBRID] Extracted ${claimExtractionResult.totalClaimsFound} claims from text`);
    
    // PHASE 3: Analyze visual elements with Vision API (in parallel with text)
    console.log('[HYBRID] Phase 3: Analyzing visual elements...');
    const imageDir = join(tempDir, 'images');
    await mkdir(imageDir, { recursive: true });
    
    // Limit visual pages to analyze
    const pagesToAnalyzeVisually = visualPages.slice(0, 30);
    const pageImages = await convertPagesToImages(localFilePath, imageDir, pagesToAnalyzeVisually);
    
    const visionResults = await analyzeVisualElements(pageImages, dimensions, customPrompts);
    console.log(`[HYBRID] Found ${visionResults.visualClaims.length} visual claims`);
    
    // Convert visual claims to ExtractedClaim format and merge
    const visualExtractedClaims = visualClaimsToExtractedClaims(visionResults.visualClaims);
    const allClaims = [...claimExtractionResult.claims, ...visualExtractedClaims];
    console.log(`[HYBRID] Total claims for assessment: ${allClaims.length}`);
    
    // Clean up images
    for (const [, imgPath] of pageImages) {
      try {
        await unlink(imgPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // PHASE 4: Parallel subcategory assessment (G-Eval inspired)
    console.log('[HYBRID] Phase 4: Running parallel subcategory assessments (G-Eval inspired)...');
    const subcategories = dimensionsToSubcategories(dimensions, customPrompts);
    console.log(`[HYBRID] Assessing ${subcategories.length} subcategories in parallel`);
    
    const subcategoryResults = await assessAllSubcategories(
      allClaims,
      subcategories,
      combinedText.slice(0, 5000) // Additional context
    );
    
    const successCount = subcategoryResults.filter(r => !r.error).length;
    const failCount = subcategoryResults.filter(r => r.error).length;
    console.log(`[HYBRID] Subcategory assessments: ${successCount} succeeded, ${failCount} failed`);
    
    // PHASE 5: Aggregate results
    console.log('[HYBRID] Phase 5: Aggregating results...');
    const aggregatedResult = await aggregateResults(
      allClaims,
      subcategoryResults,
      subcategories
    );
    
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[HYBRID] Analysis complete in ${processingTime} seconds`);
    console.log(`[HYBRID] Overall score: ${aggregatedResult.overallScore}`);

    // Format results for frontend
    const formattedResult = formatResultsForFrontend(
      aggregatedResult,
      fileName,
      totalPages,
      pagesToProcess,
      textChunks.length,
      pagesToAnalyzeVisually.length,
      processingTime
    );

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

    // Clean up temp directory
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return json({
      success: true,
      analysisType: 'hybrid',
      assessment: formattedResult
    });

  } catch (error) {
    console.error('[HYBRID] Analysis error:', error);
    
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
