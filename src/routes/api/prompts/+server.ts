import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAssessmentPrompts, updateAssessmentPrompt, resetPromptToDefault } from '$lib/supabase';

// GET - Fetch all assessment prompts
export const GET: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('userId');
  
  try {
    const prompts = await getAssessmentPrompts(userId || undefined);
    
    // Group prompts by principle for easier display
    const groupedPrompts = prompts.reduce((acc, prompt) => {
      const principleKey = `principle_${prompt.principle_id}`;
      if (!acc[principleKey]) {
        acc[principleKey] = {
          id: prompt.principle_id,
          name: prompt.principle_name,
          subcategories: []
        };
      }
      acc[principleKey].subcategories.push({
        id: prompt.subcategory_id,
        name: prompt.subcategory_name,
        prompt: prompt.prompt_template,
        weight: prompt.weight,
        isCustom: !!prompt.user_id
      });
      return acc;
    }, {} as Record<string, any>);
    
    return json({
      success: true,
      prompts: Object.values(groupedPrompts)
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return json({
      success: false,
      error: 'Failed to fetch prompts'
    }, { status: 500 });
  }
};

// POST - Update a prompt
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { userId, subcategoryId, promptTemplate, weight } = await request.json();
    
    if (!userId || !subcategoryId || !promptTemplate) {
      return json({
        success: false,
        error: 'Missing required fields: userId, subcategoryId, promptTemplate'
      }, { status: 400 });
    }
    
    const updatedPrompt = await updateAssessmentPrompt(
      userId,
      subcategoryId,
      promptTemplate,
      weight
    );
    
    if (!updatedPrompt) {
      return json({
        success: false,
        error: 'Failed to update prompt'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      prompt: updatedPrompt
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return json({
      success: false,
      error: 'Failed to update prompt'
    }, { status: 500 });
  }
};

// DELETE - Reset a prompt to default
export const DELETE: RequestHandler = async ({ url }) => {
  const userId = url.searchParams.get('userId');
  const subcategoryId = url.searchParams.get('subcategoryId');
  
  if (!userId || !subcategoryId) {
    return json({
      success: false,
      error: 'Missing required parameters: userId, subcategoryId'
    }, { status: 400 });
  }
  
  try {
    const success = await resetPromptToDefault(userId, subcategoryId);
    
    if (!success) {
      return json({
        success: false,
        error: 'Failed to reset prompt'
      }, { status: 500 });
    }
    
    return json({
      success: true,
      message: 'Prompt reset to default'
    });
  } catch (error) {
    console.error('Error resetting prompt:', error);
    return json({
      success: false,
      error: 'Failed to reset prompt'
    }, { status: 500 });
  }
};
