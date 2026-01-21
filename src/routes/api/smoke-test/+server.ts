import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';
import { extractClaims } from '$lib/multi-prompt-analysis';

interface SmokeTestResult {
  status: 'pass' | 'fail';
  timestamp: string;
  tests: {
    name: string;
    status: 'pass' | 'fail';
    duration_ms: number;
    details?: string;
    error?: string;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration_ms: number;
  };
}

// Test document content for smoke testing
const TEST_DOCUMENT_CONTENT = `
Green Horizon Investments - Sustainability Report

Our Commitment to the Environment:
1. We are committed to achieving net-zero carbon emissions by 2030.
2. All our products are 100% recyclable and made from sustainable materials.
3. We have reduced our carbon footprint by 50% since 2020.
4. Our operations are powered by 100% renewable energy.
5. We plant one tree for every product sold.

Environmental Claims:
- "Carbon neutral operations since 2023"
- "Zero waste to landfill"
- "Sustainable packaging made from ocean plastic"
- "Climate-positive company"
- "Third-party verified ESG methodology"

Investment Products:
- Net-Zero ETF: Invest with a net-zero portfolio approach
- Green Bond Ladder: Paris-aligned investing for the real economy
- Impact Notes: Nature-positive capital allocation
`;

export const GET: RequestHandler = async ({ url }) => {
  const startTime = Date.now();
  const verbose = url.searchParams.get('verbose') === 'true';
  
  const result: SmokeTestResult = {
    status: 'pass',
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      duration_ms: 0
    }
  };

  // Test 1: OpenAI API Connectivity
  const test1Start = Date.now();
  try {
    const client = new OpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: 'Respond with exactly: SMOKE_TEST_OK' }],
      max_tokens: 20
    });
    
    const content = response.choices[0]?.message?.content || '';
    const passed = content.includes('SMOKE_TEST_OK') || content.includes('OK');
    
    result.tests.push({
      name: 'OpenAI API Connectivity',
      status: passed ? 'pass' : 'fail',
      duration_ms: Date.now() - test1Start,
      details: verbose ? `Response: ${content}` : undefined
    });
  } catch (error) {
    result.tests.push({
      name: 'OpenAI API Connectivity',
      status: 'fail',
      duration_ms: Date.now() - test1Start,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Claim Extraction
  const test2Start = Date.now();
  try {
    const claimResult = await extractClaims(TEST_DOCUMENT_CONTENT, 10000);
    const passed = claimResult.totalClaimsFound >= 3; // Should find at least 3 claims
    
    result.tests.push({
      name: 'Claim Extraction',
      status: passed ? 'pass' : 'fail',
      duration_ms: Date.now() - test2Start,
      details: verbose ? `Extracted ${claimResult.totalClaimsFound} claims` : undefined,
      error: !passed ? `Expected at least 3 claims, got ${claimResult.totalClaimsFound}` : undefined
    });
  } catch (error) {
    result.tests.push({
      name: 'Claim Extraction',
      status: 'fail',
      duration_ms: Date.now() - test2Start,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Vision API (if available)
  const test3Start = Date.now();
  try {
    const client = new OpenAI();
    // Simple vision capability check without an actual image
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ 
        role: 'user', 
        content: 'Can you analyze images? Respond with YES or NO only.' 
      }],
      max_tokens: 10
    });
    
    const content = response.choices[0]?.message?.content || '';
    const passed = content.toUpperCase().includes('YES');
    
    result.tests.push({
      name: 'Vision API Capability',
      status: passed ? 'pass' : 'fail',
      duration_ms: Date.now() - test3Start,
      details: verbose ? `Response: ${content}` : undefined
    });
  } catch (error) {
    result.tests.push({
      name: 'Vision API Capability',
      status: 'fail',
      duration_ms: Date.now() - test3Start,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: JSON Response Format
  const test4Start = Date.now();
  try {
    const client = new OpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ 
        role: 'user', 
        content: 'Return a JSON object with a single key "test" and value "success"' 
      }],
      max_tokens: 50,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const passed = parsed.test === 'success';
    
    result.tests.push({
      name: 'JSON Response Format',
      status: passed ? 'pass' : 'fail',
      duration_ms: Date.now() - test4Start,
      details: verbose ? `Parsed: ${JSON.stringify(parsed)}` : undefined
    });
  } catch (error) {
    result.tests.push({
      name: 'JSON Response Format',
      status: 'fail',
      duration_ms: Date.now() - test4Start,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Calculate summary
  result.summary.total = result.tests.length;
  result.summary.passed = result.tests.filter(t => t.status === 'pass').length;
  result.summary.failed = result.tests.filter(t => t.status === 'fail').length;
  result.summary.duration_ms = Date.now() - startTime;
  result.status = result.summary.failed === 0 ? 'pass' : 'fail';

  const httpStatus = result.status === 'pass' ? 200 : 500;

  return json(result, { status: httpStatus });
};
