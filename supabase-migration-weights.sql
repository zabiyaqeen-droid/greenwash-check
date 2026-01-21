-- Migration: Add weight column to assessment_prompts table
-- Run this in your Supabase SQL Editor

-- Add weight column to assessment_prompts if it doesn't exist
ALTER TABLE assessment_prompts 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 1.0;

-- Update principle_id to use integer format for consistency
-- First, let's update the existing prompts with proper weights based on principle

-- Principle 1: Be Truthful - Weight 1.0 (baseline)
UPDATE assessment_prompts SET weight = 1.0 WHERE principle_id = 'principle-1' OR principle_id = '1';

-- Principle 2: Be Substantiated - Weight 1.2 (higher - core requirement)
UPDATE assessment_prompts SET weight = 1.2 WHERE principle_id = 'principle-2' OR principle_id = '2';

-- Principle 3: Be Specific About Comparisons - Weight 0.9 (slightly lower)
UPDATE assessment_prompts SET weight = 0.9 WHERE principle_id = 'principle-3' OR principle_id = '3';

-- Principle 4: Be Proportionate - Weight 1.0 (baseline)
UPDATE assessment_prompts SET weight = 1.0 WHERE principle_id = 'principle-4' OR principle_id = '4';

-- Principle 5: When in Doubt, Spell it Out - Weight 1.1 (elevated - clarity critical)
UPDATE assessment_prompts SET weight = 1.1 WHERE principle_id = 'principle-5' OR principle_id = '5';

-- Principle 6: Substantiate Future Claims - Weight 1.1 (elevated - future claims high-risk)
UPDATE assessment_prompts SET weight = 1.1 WHERE principle_id = 'principle-6' OR principle_id = '6';

-- Verify the update
SELECT principle_id, principle_name, subcategory_name, weight 
FROM assessment_prompts 
WHERE user_id IS NULL 
ORDER BY principle_id, subcategory_id;
