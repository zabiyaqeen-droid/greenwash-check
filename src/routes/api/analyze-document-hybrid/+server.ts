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
  getDocumentChunks,
  searchDocumentChunks,
  deleteDocumentChunks,
  type AssessmentPrompt 
} from '$lib/supabase';
import {
  extractTextWithPages,
  splitTextIntoChunks,
  storeChunksWithEmbeddings,
  generateEmbedding,
  detectVisualContent
} from '$lib/embeddings';

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

interface TextAnalysisResult {
  claims: Array<{
    text: string;
    type: string;
    page: number;
    context: string;
  }>;
  findings: Array<{
    principle: string;
    subcategory: string;
    claim: string;
    assessment: string;
    severity: 'High' | 'Medium' | 'Low';
    page: number;
  }>;
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

// Build assessment framework prompt
function buildAssessmentFramework(dimensions: any[], customPrompts?: AssessmentPrompt[]): string {
  const enabledDimensions = dimensions.filter((d: any) => d.enabled !== false);
  
  let framework = `COMPETITION BUREAU'S 6 PRINCIPLES FOR ENVIRONMENTAL CLAIMS:\n\n`;
  
  enabledDimensions.forEach((d: any) => {
    framework += `PRINCIPLE ${d.id}: ${d.name}\n`;
    framework += `Description: ${d.principle || d.description}\n`;
    framework += `Subcategories to evaluate:\n`;
    
    const enabledCriteria = d.criteria?.filter((c: any) => c.enabled !== false) || [];
    enabledCriteria.forEach((c: any) => {
      const customPrompt = customPrompts?.find(p => p.subcategory_id === c.id);
      const promptText = customPrompt?.prompt_template || c.description;
      const weight = customPrompt?.weight ?? c.weight ?? 1.0;
      
      framework += `   - ${c.name} (Weight: ${weight}x): ${promptText}\n`;
    });
    framework += `\n`;
  });
  
  return framework;
}

// Analyze text chunks using embeddings and LLM
async function analyzeTextChunks(
  documentId: string,
  dimensions: any[],
  customPrompts?: AssessmentPrompt[]
): Promise<TextAnalysisResult> {
  const chunks = await getDocumentChunks(documentId);
  
  if (chunks.length === 0) {
    return { claims: [], findings: [] };
  }
  
  const framework = buildAssessmentFramework(dimensions, customPrompts);
  
  // Combine chunks for analysis (up to token limit)
  const combinedText = chunks
    .slice(0, 50) // Limit to first 50 chunks
    .map(c => `[Page ${c.page_number || 'N/A'}]\n${c.content}`)
    .join('\n\n---\n\n');
  
  const prompt = `Analyze the following sustainability report text for environmental claims and potential greenwashing issues.

${framework}

CRITICAL INSTRUCTION - EXTRACT ALL CLAIMS:
You MUST extract EVERY environmental or sustainability-related claim. Look for:
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

DOCUMENT TEXT:
${combinedText}

Identify ALL environmental claims and assess each against the Competition Bureau's 6 Principles.

Return JSON:
{
  "claims": [
    {
      "text": "exact quote of the claim",
      "type": "carbon|energy|waste|water|biodiversity|general",
      "page": <page number>,
      "context": "surrounding context"
    }
  ],
  "findings": [
    {
      "principle": "principle name",
      "subcategory": "subcategory name",
      "claim": "the problematic claim",
      "assessment": "detailed assessment of the issue",
      "severity": "High|Medium|Low",
      "page": <page number>
    }
  ]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Canadian environmental law and Bill C-59 greenwashing provisions. Analyze documents for environmental claims and potential compliance issues.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Error analyzing text chunks:', error);
    return { claims: [], findings: [] };
  }
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
  
  const framework = buildAssessmentFramework(dimensions, customPrompts);
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

${framework}

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

// Semantic search for specific principle-related content
async function searchForPrincipleContent(
  documentId: string,
  principle: string,
  subcategory: string
): Promise<string[]> {
  const searchQuery = `${principle} ${subcategory} environmental claim sustainability`;
  
  try {
    const queryEmbedding = await generateEmbedding(searchQuery);
    const relevantChunks = await searchDocumentChunks(documentId, queryEmbedding, 5, 0.6);
    
    return relevantChunks.map(c => c.content);
  } catch (error) {
    console.error('Error in semantic search:', error);
    return [];
  }
}

// Aggregate all results into final assessment
async function aggregateHybridResults(
  textResults: TextAnalysisResult,
  visionResults: VisionAnalysisResult,
  dimensions: any[],
  customPrompts?: AssessmentPrompt[]
): Promise<any> {
  const allClaims = [
    ...textResults.claims,
    ...visionResults.visualClaims.flatMap(vc => 
      vc.claimsIdentified.map(claim => ({
        text: claim,
        type: 'visual',
        page: vc.page,
        context: vc.description
      }))
    )
  ];
  
  const allFindings = [
    ...textResults.findings,
    ...visionResults.visualClaims.flatMap(vc => 
      vc.concerns.map(concern => ({
        principle: 'Visual Representation',
        subcategory: vc.type,
        claim: vc.claimsIdentified.join('; '),
        assessment: concern,
        severity: 'Medium' as const,
        page: vc.page
      }))
    )
  ];
  
  const enabledDimensions = dimensions.filter((d: any) => d.enabled !== false);
  
  // CRITICAL: If no claims were found, this is a problem
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
  
  // Build aggregation prompt
  const aggregationPrompt = `Based on analyzing a sustainability report with BOTH text and visual content, here are ALL findings:

TOTAL CLAIMS FOUND: ${allClaims.length}
Text Claims: ${textResults.claims.length}
Visual Claims: ${visionResults.visualClaims.length}
${noClaimsWarning}

CLAIMS:
${allClaims.length > 0 ? JSON.stringify(allClaims.slice(0, 30), null, 2) : 'NO CLAIMS EXTRACTED - See warning above'}

FINDINGS:
${allFindings.length > 0 ? JSON.stringify(allFindings, null, 2) : 'NO FINDINGS EXTRACTED'}

VISUAL ELEMENTS ANALYZED:
${JSON.stringify(visionResults.visualClaims, null, 2)}

Provide a COMPREHENSIVE assessment scoring EACH of the 6 Principles AND EACH subcategory.

For EACH principle and subcategory:
1. Score 0-100 (100 = fully compliant)
2. Explain rationale with SPECIFIC EXAMPLES
3. Include page references
4. Provide actionable recommendations

Return JSON:
{
  "overallScore": <0-100>,
  "riskLevel": "Low Risk" | "Medium Risk" | "High Risk",
  "executiveSummary": "3-4 sentence summary",
  "totalClaimsAnalyzed": ${allClaims.length},
  "textClaimsCount": ${textResults.claims.length},
  "visualClaimsCount": ${visionResults.visualClaims.length},
  "principleScores": [
    ${enabledDimensions.map((d: any) => {
      const enabledCriteria = d.criteria?.filter((c: any) => c.enabled !== false) || [];
      return `{
      "id": "${d.id}",
      "name": "${d.name}",
      "principle": "${d.principle || ''}",
      "overallScore": <0-100>,
      "status": "Compliant" | "Needs Attention" | "High Risk",
      "summary": "summary of findings",
      "subcategories": [
        ${enabledCriteria.map((c: any) => `{
          "id": "${c.id}",
          "name": "${c.name}",
          "score": <0-100>,
          "status": "Compliant" | "Needs Attention" | "High Risk",
          "rationale": "specific rationale with evidence",
          "evidence": [{"quote": "...", "pageReference": "Page X", "context": "..."}],
          "recommendations": ["recommendation"]
        }`).join(',\n        ')}
      ]
    }`}).join(',\n    ')}
  ],
  "legalRiskAssessment": {
    "penaltyExposure": "potential penalty range",
    "enforcementRisk": "Low" | "Medium" | "High",
    "priorityActions": ["action 1", "action 2"]
  },
  "keyStrengths": [{"title": "...", "description": "...", "evidence": "...", "pageReference": "..."}],
  "criticalIssues": [{"title": "...", "description": "...", "principle": "...", "evidence": "...", "pageReference": "...", "recommendation": "..."}]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert in Canadian environmental law and Bill C-59 greenwashing provisions. 
Provide comprehensive assessments that score EACH principle and subcategory with specific evidence.
Consider BOTH text claims and visual representations in your assessment.`
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
    return {
      overallScore: 50,
      riskLevel: 'Medium Risk',
      executiveSummary: 'Hybrid analysis completed. Manual review recommended.',
      totalClaimsAnalyzed: allClaims.length,
      principleScores: []
    };
  }
}

// Apply weighted scoring
function applyWeightedScoring(result: any, dimensions: any[], customPrompts?: AssessmentPrompt[]): any {
  if (!result || !result.principleScores) {
    return result;
  }

  const weightMap: Record<string, number> = {};
  if (customPrompts) {
    for (const prompt of customPrompts) {
      weightMap[prompt.subcategory_id] = prompt.weight ?? 1.0;
    }
  }

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

  const updatedPrincipleScores = result.principleScores.map((principle: any) => {
    if (!principle.subcategories || principle.subcategories.length === 0) {
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

  const weightedOverallScore = totalWeight > 0 
    ? Math.round(totalWeightedScore / totalWeight) 
    : result.overallScore || 0;

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

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  let localFilePath: string | null = null;
  let tempDir: string | null = null;
  
  try {
    const body: AnalyzeRequest = await request.json();
    const { fileId, filePath, fileName, dimensions, userId } = body;

    console.log(`[HYBRID] Starting analysis of ${fileName}`);

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

    // PHASE 1: Extract text and create embeddings
    console.log('[HYBRID] Phase 1: Extracting text and generating embeddings...');
    
    // Delete any existing chunks for this document
    await deleteDocumentChunks(fileId);
    
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
    
    console.log(`[HYBRID] Extracted ${textChunks.length} text chunks, ${visualPages.length} pages with visual content`);
    
    // Store chunks with embeddings
    if (textChunks.length > 0 && userId) {
      await storeChunksWithEmbeddings(fileId, userId, textChunks);
    }
    
    // PHASE 2: Analyze text using embeddings
    console.log('[HYBRID] Phase 2: Analyzing text content...');
    const textResults = await analyzeTextChunks(fileId, dimensions, customPrompts);
    console.log(`[HYBRID] Found ${textResults.claims.length} text claims, ${textResults.findings.length} findings`);
    
    // PHASE 3: Analyze visual elements with Vision API
    console.log('[HYBRID] Phase 3: Analyzing visual elements...');
    const imageDir = join(tempDir, 'images');
    await mkdir(imageDir, { recursive: true });
    
    // Limit visual pages to analyze (prioritize pages with most visual content)
    const pagesToAnalyzeVisually = visualPages.slice(0, 30);
    const pageImages = await convertPagesToImages(localFilePath, imageDir, pagesToAnalyzeVisually);
    
    const visionResults = await analyzeVisualElements(pageImages, dimensions, customPrompts);
    console.log(`[HYBRID] Found ${visionResults.visualClaims.length} visual claims`);
    
    // Clean up images
    for (const [, imgPath] of pageImages) {
      try {
        await unlink(imgPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    // PHASE 4: Aggregate results
    console.log('[HYBRID] Phase 4: Aggregating results...');
    const aggregatedResult = await aggregateHybridResults(
      textResults,
      visionResults,
      dimensions,
      customPrompts
    );
    
    // Apply weighted scoring
    const weightedResult = applyWeightedScoring(aggregatedResult, dimensions, customPrompts);
    
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`[HYBRID] Analysis complete in ${processingTime} seconds`);

    // Save assessment result
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
      assessment: {
        ...weightedResult,
        metadata: {
          fileName,
          totalPages,
          pagesAnalyzed: pagesToProcess,
          textChunksProcessed: textChunks.length,
          visualPagesAnalyzed: pagesToAnalyzeVisually.length,
          processingTimeSeconds: processingTime,
          assessmentDate: new Date().toISOString(),
          framework: 'Competition Bureau 6 Principles + Bill C-59 (Hybrid Analysis)'
        }
      }
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
