# Greenwash Check - Project Configuration

## Deployment
- **Platform**: Render (NOT Vercel, NOT Docker standalone)
- **URL**: https://greenwash-check.onrender.com
- **Auto-deploy**: Yes, from GitHub main branch
- **GitHub Repo**: zabiyaqeen-droid/greenwash-check

## Database
- **Platform**: Supabase
- **Features Used**: PostgreSQL, pgvector (for embeddings)

## Tech Stack
- **Frontend**: SvelteKit with TypeScript
- **Styling**: Custom CSS (no Tailwind)
- **Backend**: SvelteKit API routes
- **AI**: OpenAI API for document analysis

## Key Files
- `src/routes/assess/+page.svelte` - Main assessment page
- `src/routes/prompts/+page.svelte` - Prompts configuration page
- `src/lib/components/PromptsPanel.svelte` - Prompts panel component (embedded in Assess page)
- `src/routes/api/analyze-document/+server.ts` - Document analysis API
- `src/routes/api/prompts/+server.ts` - Prompts API
- `src/lib/supabase.ts` - Supabase client and functions
- `supabase-setup.sql` - Database schema
- `supabase-migration-weights.sql` - Migration for weight column

## Company
- **Owner**: Muuvment Ltd.
- **Jurisdiction**: Ontario, Canada

## Important Notes
- Weights are decimal multipliers (0.1-3.0x), not percentages
- 6 Principles from Competition Bureau Canada
- 18 subcategories (3 per principle)
- Anti-Greenwash Charter integrated into methodology
- Bill C-59 and Competition Bureau guidelines take precedence
