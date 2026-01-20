import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client to avoid build-time errors
let _client: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI();
  }
  return _client;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, criteria } = await request.json();

    if (!text) {
      return json({ error: 'No text provided' }, { status: 400 });
    }

    const criteriaList = criteria?.length > 0 
      ? criteria.map((c: any) => `- ${c.name}: ${c.description}`).join('\n')
      : `- Factual Accuracy: Claims must be factually accurate
- General Impression: Overall impression must not be misleading
- Material Omissions: No significant information should be omitted
- Evidence Support: Claims must be supported by evidence
- Clear Language: Avoid vague or ambiguous terms
- Scope Definition: Clear definition of what the claim covers`;

    const systemPrompt = `You are an expert in Canadian environmental marketing law, specifically Bill C-59 and Competition Bureau guidelines on greenwashing. Analyse the provided environmental claim and return a JSON assessment.

Assessment Criteria:
${criteriaList}

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number 0-100>,
  "riskLevel": "<Low|Medium|High>",
  "summary": "<2-3 sentence summary>",
  "dimensions": [
    {
      "name": "Truthfulness & Accuracy",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"]
    },
    {
      "name": "Substantiation",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"]
    },
    {
      "name": "Clarity & Specificity",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"]
    },
    {
      "name": "Comparisons & Context",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"]
    }
  ],
  "keyFindings": ["<key finding 1>", "<key finding 2>", "<key finding 3>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyse this environmental claim:\n\n${text}` }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return json(result);
  } catch (error) {
    console.error('Assessment error:', error);
    return json({ error: 'Assessment failed: ' + (error as Error).message }, { status: 500 });
  }
};
