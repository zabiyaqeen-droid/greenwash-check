import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Dimension } from '$lib/stores/criteria';

const execAsync = promisify(exec);

// Lazy initialization of OpenAI client
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

// Increase body size limit for this endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '30mb'
    }
  }
};

interface ProcessRequest {
  fileData: string; // Base64 encoded file
  fileName: string;
  fileType: string;
  dimensions: Dimension[];
}

async function convertPdfToImages(pdfPath: string, outputDir: string, maxPages: number = 200): Promise<string[]> {
  // Use pdftoppm to convert PDF to PNG images
  // -png: output PNG format
  // -r 150: 150 DPI resolution (good balance of quality and size)
  // -f 1 -l maxPages: first page to last page
  const outputPrefix = join(outputDir, 'page');
  
  try {
    // Get total page count first
    const { stdout: pageCountOutput } = await execAsync(`pdfinfo "${pdfPath}" | grep Pages | awk '{print $2}'`);
    const totalPages = parseInt(pageCountOutput.trim()) || 1;
    const pagesToProcess = Math.min(totalPages, maxPages);
    
    console.log(`PDF has ${totalPages} pages, processing first ${pagesToProcess} pages`);
    
    // Convert pages to images
    await execAsync(`pdftoppm -png -r 150 -f 1 -l ${pagesToProcess} "${pdfPath}" "${outputPrefix}"`);
    
    // Find all generated images
    const { stdout: lsOutput } = await execAsync(`ls -1 "${outputDir}"/page-*.png 2>/dev/null || true`);
    const imageFiles = lsOutput.trim().split('\n').filter(f => f.length > 0);
    
    console.log(`Generated ${imageFiles.length} images`);
    return imageFiles.sort();
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error('Failed to convert PDF to images');
  }
}

async function analyzeImagesWithVision(
  imagePaths: string[], 
  fileName: string,
  dimensions: Dimension[],
  systemPrompt: string
): Promise<any> {
  const client = getOpenAIClient();
  
  // Read images and convert to base64
  const imageContents: Array<{ type: 'image_url'; image_url: { url: string; detail: string } }> = [];
  
  for (const imagePath of imagePaths) {
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    imageContents.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${base64Image}`,
        detail: 'high'
      }
    });
  }

  const userPrompt = `Please analyze this sustainability/environmental document "${fileName}" (${imagePaths.length} pages shown) for greenwashing risks. Examine all text, images, charts, graphs, and visual elements thoroughly.

Provide your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence executive summary of the overall assessment",
  "overallScore": <number 0-100>,
  "documentAnalysis": {
    "totalPages": ${imagePaths.length},
    "keyClaimsFound": ["<list of main environmental claims found>"],
    "visualElementsAnalyzed": ["<description of charts, graphs, images analyzed>"]
  },
  "dimensionResults": [
    {
      "dimensionId": "<dimension id>",
      "dimensionName": "<dimension name>",
      "score": <number 0-100>,
      "criteriaResults": [
        {
          "criterionId": "<criterion id>",
          "criterionName": "<criterion name>",
          "score": <number 0-100>,
          "finding": "<specific finding>",
          "recommendation": "<specific recommendation>",
          "quotes": ["<relevant quote or description from document>"]
        }
      ]
    }
  ],
  "keyFindings": ["<top 5-7 key findings from the document>"],
  "recommendations": ["<top 5-7 overall recommendations>"]
}

Ensure your response is valid JSON only, with no additional text.`;

  const response = await client.chat.completions.create({
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
    temperature: 0.3,
    max_tokens: 8000
  });

  return response.choices[0]?.message?.content;
}

export const POST: RequestHandler = async ({ request }) => {
  const tempDir = '/tmp/greenwash-processing';
  let pdfPath = '';
  let imageDir = '';
  
  try {
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    const { fileData, fileName, fileType, dimensions }: ProcessRequest = await request.json();
    
    if (!fileData || !fileName) {
      return json({ error: 'No file data provided' }, { status: 400 });
    }
    
    console.log(`Processing document: ${fileName} (${fileType})`);
    
    // Extract base64 data
    const base64Data = fileData.includes('base64,') 
      ? fileData.split('base64,')[1] 
      : fileData;
    
    // Create unique temp directory for this request
    const requestId = Date.now().toString();
    imageDir = join(tempDir, requestId);
    await mkdir(imageDir, { recursive: true });
    
    // Build criteria prompt
    const enabledDimensions = dimensions.filter(d => d.criteria.some(c => c.enabled));
    const criteriaPrompt = enabledDimensions.map(dim => {
      const enabledCriteria = dim.criteria.filter(c => c.enabled);
      return `
## ${dim.name} (Importance: ${dim.importance}/10)
${dim.description}
Regulatory Alignment: ${dim.regulatoryAlignment}

Criteria to evaluate:
${enabledCriteria.map(c => `- ${c.id}: ${c.name} - ${c.description}
  Risk indicators: ${c.riskIndicators.join('; ')}`).join('\n')}
`;
    }).join('\n');

    const systemPrompt = `You are an expert greenwashing analyst specializing in Canadian environmental claims legislation, particularly the Competition Act amendments from Bill C-59 (2024). Your task is to analyze environmental claims and assess them against established greenwashing criteria.

You must evaluate the provided content against the following dimensions and criteria:

${criteriaPrompt}

For each criterion, provide:
1. A score from 0-100 (100 = no greenwashing risk, 0 = critical greenwashing risk)
2. A specific finding explaining your assessment
3. A recommendation for improvement
4. Any relevant quotes or descriptions from the content that support your finding

Be thorough, specific, and cite evidence from the content. Consider both explicit statements and implicit impressions created by the language, imagery, and presentation.

IMPORTANT: You are analyzing a document that may contain:
- Text content and environmental claims
- Charts, graphs, and data visualizations
- Images and infographics
- Tables with sustainability metrics

Analyze ALL visual and textual elements. Pay special attention to:
- Whether charts and graphs accurately represent the data
- If visual elements create misleading impressions
- Whether imagery is relevant or just "greenwashing" decoration
- If claims in text are supported by the data shown in charts
- Any discrepancies between visual presentation and actual content`;

    let analysisContent: string | null = null;
    const client = getOpenAIClient();
    
    if (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      // Save PDF to temp file
      pdfPath = join(imageDir, 'document.pdf');
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      await writeFile(pdfPath, pdfBuffer);
      
      console.log(`Saved PDF to ${pdfPath}, size: ${pdfBuffer.length} bytes`);
      
    // Convert pages to images (max 200 pages)
      const imagePaths = await convertPdfToImages(pdfPath, imageDir, 200);
      
      if (imagePaths.length === 0) {
        return json({ error: 'Failed to extract pages from PDF' }, { status: 500 });
      }
      
      // Analyze images with Vision API
      analysisContent = await analyzeImagesWithVision(imagePaths, fileName, dimensions, systemPrompt);
      
    } else if (fileType.includes('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName)) {
      // For images, send directly to Vision API
      const response = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: `Please analyze this image "${fileName}" for greenwashing risks.` },
              { 
                type: 'image_url', 
                image_url: { 
                  url: fileData,
                  detail: 'high'
                } 
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 8000
      });
      
      analysisContent = response.choices[0]?.message?.content;
      
    } else {
      return json({ error: 'Unsupported file type. Please upload a PDF or image file.' }, { status: 400 });
    }
    
    if (!analysisContent) {
      return json({ error: 'No response from AI analysis' }, { status: 500 });
    }
    
    // Parse the JSON response
    let analysisResult;
    try {
      const cleanContent = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisContent);
      return json({ error: 'Failed to parse assessment results. Please try again.' }, { status: 500 });
    }

    // Add importance to dimension results
    if (analysisResult.dimensionResults) {
      analysisResult.dimensionResults = analysisResult.dimensionResults.map((dr: any) => {
        const dim = dimensions.find(d => d.id === dr.dimensionId);
        return {
          ...dr,
          importance: dim?.importance || 5
        };
      });

      // Calculate weighted overall score
      const totalImportance = analysisResult.dimensionResults.reduce((sum: number, dr: any) => sum + dr.importance, 0);
      if (totalImportance > 0) {
        const weightedScore = analysisResult.dimensionResults.reduce((sum: number, dr: any) => {
          return sum + (dr.score * dr.importance);
        }, 0) / totalImportance;
        analysisResult.overallScore = Math.round(weightedScore);
      }
    }

    // Determine risk level
    if (analysisResult.overallScore >= 75) {
      analysisResult.riskLevel = 'low';
    } else if (analysisResult.overallScore >= 50) {
      analysisResult.riskLevel = 'medium';
    } else if (analysisResult.overallScore >= 25) {
      analysisResult.riskLevel = 'high';
    } else {
      analysisResult.riskLevel = 'critical';
    }

    // Transform for frontend compatibility
    const transformedResult = {
      summary: analysisResult.summary,
      overallScore: analysisResult.overallScore,
      riskLevel: analysisResult.riskLevel,
      documentAnalysis: analysisResult.documentAnalysis || null,
      dimensionScores: analysisResult.dimensionResults?.map((dr: any) => ({
        id: dr.dimensionId,
        name: dr.dimensionName,
        score: dr.score,
        finding: dr.criteriaResults?.[0]?.finding || 'No specific finding',
        importance: dr.importance
      })) || [],
      keyFindings: analysisResult.keyFindings || [],
      recommendations: analysisResult.recommendations || [],
      detailedResults: analysisResult.dimensionResults || []
    };

    return json(transformedResult);

  } catch (error) {
    console.error('Document processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: `Failed to process document: ${errorMessage}` }, { status: 500 });
  } finally {
    // Clean up temp files
    try {
      if (imageDir && existsSync(imageDir)) {
        await execAsync(`rm -rf "${imageDir}"`);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
};
