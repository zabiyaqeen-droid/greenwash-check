import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import OpenAI from 'openai';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    server: boolean;
    openai: boolean;
    supabase: boolean;
  };
  latency: {
    openai_ms?: number;
    supabase_ms?: number;
  };
  errors: string[];
}

export const GET: RequestHandler = async () => {
  const startTime = Date.now();
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      server: true,
      openai: false,
      supabase: false
    },
    latency: {},
    errors: []
  };

  // Check OpenAI connectivity
  try {
    const openaiStart = Date.now();
    const client = new OpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [{ role: 'user', content: 'Health check: respond with OK' }],
      max_tokens: 10
    });
    status.checks.openai = response.choices[0]?.message?.content?.includes('OK') || response.choices.length > 0;
    status.latency.openai_ms = Date.now() - openaiStart;
  } catch (error) {
    status.checks.openai = false;
    status.errors.push(`OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check Supabase connectivity
  try {
    const supabaseStart = Date.now();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      status.checks.supabase = response.ok || response.status === 400; // 400 means it's responding
      status.latency.supabase_ms = Date.now() - supabaseStart;
    } else {
      status.checks.supabase = false;
      status.errors.push('Supabase: URL not configured');
    }
  } catch (error) {
    status.checks.supabase = false;
    status.errors.push(`Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Determine overall status
  if (!status.checks.openai) {
    status.status = 'unhealthy';
  } else if (!status.checks.supabase) {
    status.status = 'degraded';
  }

  const httpStatus = status.status === 'healthy' ? 200 : status.status === 'degraded' ? 200 : 503;

  return json(status, { status: httpStatus });
};
