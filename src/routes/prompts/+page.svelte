<script lang="ts">
  import { onMount } from 'svelte';
  import { Save, RotateCcw, ChevronDown, ChevronUp, Edit3, Check, X, Info, AlertTriangle } from 'lucide-svelte';

  interface Subcategory {
    id: string;
    name: string;
    prompt: string;
    weight: number;
    isCustom: boolean;
  }

  interface Principle {
    id: number;
    name: string;
    subcategories: Subcategory[];
  }

  let principles: Principle[] = [];
  let loading = true;
  let error = '';
  let expandedPrinciples: Set<number> = new Set([1]); // Start with first principle expanded
  let editingPrompt: string | null = null;
  let editedPromptText = '';
  let editedWeight = 0;
  let saving = false;
  let saveMessage = '';

  // Get user ID from localStorage (set during login)
  function getUserId(): string | null {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('greenwash_user');
      if (user) {
        try {
          return JSON.parse(user).id || JSON.parse(user).email;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  async function loadPrompts() {
    loading = true;
    error = '';
    
    try {
      const userId = getUserId();
      const url = userId ? `/api/prompts?userId=${encodeURIComponent(userId)}` : '/api/prompts';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        principles = data.prompts;
      } else {
        error = data.error || 'Failed to load prompts';
      }
    } catch (e) {
      error = 'Failed to connect to server';
      console.error('Error loading prompts:', e);
    } finally {
      loading = false;
    }
  }

  function togglePrinciple(id: number) {
    if (expandedPrinciples.has(id)) {
      expandedPrinciples.delete(id);
    } else {
      expandedPrinciples.add(id);
    }
    expandedPrinciples = expandedPrinciples; // Trigger reactivity
  }

  function startEditing(subcategory: Subcategory) {
    editingPrompt = subcategory.id;
    editedPromptText = subcategory.prompt;
    editedWeight = subcategory.weight;
  }

  function cancelEditing() {
    editingPrompt = null;
    editedPromptText = '';
    editedWeight = 0;
  }

  async function savePrompt(subcategoryId: string) {
    const userId = getUserId();
    if (!userId) {
      saveMessage = 'Please log in to save custom prompts';
      setTimeout(() => saveMessage = '', 3000);
      return;
    }

    saving = true;
    
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subcategoryId,
          promptTemplate: editedPromptText,
          weight: editedWeight
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveMessage = 'Prompt saved successfully!';
        editingPrompt = null;
        await loadPrompts(); // Reload to show updated data
      } else {
        saveMessage = data.error || 'Failed to save prompt';
      }
    } catch (e) {
      saveMessage = 'Failed to save prompt';
      console.error('Error saving prompt:', e);
    } finally {
      saving = false;
      setTimeout(() => saveMessage = '', 3000);
    }
  }

  async function resetPrompt(subcategoryId: string) {
    const userId = getUserId();
    if (!userId) return;

    if (!confirm('Reset this prompt to the default? Your customizations will be lost.')) {
      return;
    }

    saving = true;
    
    try {
      const response = await fetch(`/api/prompts?userId=${encodeURIComponent(userId)}&subcategoryId=${encodeURIComponent(subcategoryId)}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        saveMessage = 'Prompt reset to default';
        await loadPrompts();
      } else {
        saveMessage = data.error || 'Failed to reset prompt';
      }
    } catch (e) {
      saveMessage = 'Failed to reset prompt';
      console.error('Error resetting prompt:', e);
    } finally {
      saving = false;
      setTimeout(() => saveMessage = '', 3000);
    }
  }

  function expandAll() {
    principles.forEach(p => expandedPrinciples.add(p.id));
    expandedPrinciples = expandedPrinciples;
  }

  function collapseAll() {
    expandedPrinciples.clear();
    expandedPrinciples = expandedPrinciples;
  }

  onMount(() => {
    loadPrompts();
  });
</script>

<svelte:head>
  <title>Assessment Prompts - Greenwash Check</title>
  <meta name="description" content="Customize the AI prompts used to assess your environmental claims against the Competition Bureau's 6 Principles." />
</svelte:head>

<div class="prompts-page">
  <div class="container">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Assessment Prompts</h1>
          <p class="subtitle">Customize how your documents are analyzed against the Competition Bureau's 6 Principles</p>
        </div>
      </div>
      
      <div class="header-actions">
        <button class="btn-secondary" onclick={expandAll}>Expand All</button>
        <button class="btn-secondary" onclick={collapseAll}>Collapse All</button>
      </div>
    </div>

    {#if saveMessage}
      <div class="save-message" class:error={saveMessage.includes('Failed') || saveMessage.includes('Please log in')}>
        {saveMessage}
      </div>
    {/if}

    <div class="info-banner">
      <Info size={20} />
      <div>
        <strong>How Prompts Work:</strong> Each subcategory has a prompt that tells the AI what to look for when analyzing your documents. 
        You can customize these prompts to focus on specific aspects relevant to your industry or reporting style.
        Changes only affect your account and can be reset to defaults at any time.
      </div>
    </div>

    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading assessment prompts...</p>
      </div>
    {:else if error}
      <div class="error-message">
        <AlertTriangle size={24} />
        <p>{error}</p>
        <button class="btn-primary" onclick={loadPrompts}>Try Again</button>
      </div>
    {:else}
      <div class="principles-list">
        {#each principles as principle (principle.id)}
          <div class="principle-card">
            <button 
              class="principle-header" 
              onclick={() => togglePrinciple(principle.id)}
              aria-expanded={expandedPrinciples.has(principle.id)}
            >
              <div class="principle-info">
                <span class="principle-number">Principle {principle.id}</span>
                <h2>{principle.name}</h2>
                <span class="subcategory-count">{principle.subcategories.length} subcategories</span>
              </div>
              <div class="expand-icon">
                {#if expandedPrinciples.has(principle.id)}
                  <ChevronUp size={24} />
                {:else}
                  <ChevronDown size={24} />
                {/if}
              </div>
            </button>

            {#if expandedPrinciples.has(principle.id)}
              <div class="subcategories">
                {#each principle.subcategories as subcategory (subcategory.id)}
                  <div class="subcategory-card" class:editing={editingPrompt === subcategory.id}>
                    <div class="subcategory-header">
                      <div class="subcategory-info">
                        <h3>{subcategory.name}</h3>
                        <div class="subcategory-meta">
                          <span class="weight-badge">Weight: {subcategory.weight}%</span>
                          {#if subcategory.isCustom}
                            <span class="custom-badge">Customized</span>
                          {/if}
                        </div>
                      </div>
                      
                      {#if editingPrompt !== subcategory.id}
                        <div class="subcategory-actions">
                          <button 
                            class="btn-icon" 
                            onclick={() => startEditing(subcategory)}
                            title="Edit prompt"
                          >
                            <Edit3 size={18} />
                          </button>
                          {#if subcategory.isCustom}
                            <button 
                              class="btn-icon reset" 
                              onclick={() => resetPrompt(subcategory.id)}
                              title="Reset to default"
                            >
                              <RotateCcw size={18} />
                            </button>
                          {/if}
                        </div>
                      {/if}
                    </div>

                    {#if editingPrompt === subcategory.id}
                      <div class="edit-form">
                        <div class="form-group">
                          <label for="prompt-{subcategory.id}">Prompt Template</label>
                          <textarea 
                            id="prompt-{subcategory.id}"
                            bind:value={editedPromptText}
                            rows="6"
                            placeholder="Enter the prompt that will guide the AI analysis..."
                          ></textarea>
                          <p class="help-text">This prompt tells the AI what to look for when evaluating this subcategory.</p>
                        </div>
                        
                        <div class="form-group weight-group">
                          <label for="weight-{subcategory.id}">Weight (%)</label>
                          <input 
                            type="number" 
                            id="weight-{subcategory.id}"
                            bind:value={editedWeight}
                            min="1"
                            max="100"
                          />
                          <p class="help-text">How much this subcategory contributes to the overall score.</p>
                        </div>

                        <div class="edit-actions">
                          <button 
                            class="btn-primary" 
                            onclick={() => savePrompt(subcategory.id)}
                            disabled={saving}
                          >
                            {#if saving}
                              Saving...
                            {:else}
                              <Save size={16} /> Save Changes
                            {/if}
                          </button>
                          <button class="btn-secondary" onclick={cancelEditing}>
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </div>
                    {:else}
                      <div class="prompt-preview">
                        <p>{subcategory.prompt}</p>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .prompts-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 2rem 0 4rem;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-content {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .icon-wrapper {
    background: #4A428E;
    color: white;
    padding: 0.75rem;
    border-radius: 12px;
  }

  h1 {
    font-size: 2rem;
    color: #1C2947;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    color: #64748b;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-primary {
    background: #356904;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s;
  }

  .btn-primary:hover {
    background: #2A5403;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: white;
    color: #4A428E;
    border: 1px solid #4A428E;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #4A428E;
    color: white;
  }

  .btn-icon {
    background: transparent;
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    color: #64748b;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: #4A428E;
    color: white;
    border-color: #4A428E;
  }

  .btn-icon.reset:hover {
    background: #dc2626;
    border-color: #dc2626;
  }

  .save-message {
    background: #dcfce7;
    color: #166534;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    text-align: center;
    font-weight: 500;
  }

  .save-message.error {
    background: #fee2e2;
    color: #dc2626;
  }

  .info-banner {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    color: #1e40af;
  }

  .info-banner strong {
    display: block;
    margin-bottom: 0.25rem;
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #4A428E;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    text-align: center;
    padding: 3rem 2rem;
    background: white;
    border-radius: 12px;
    color: #dc2626;
  }

  .error-message p {
    margin: 1rem 0;
  }

  .principles-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .principle-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .principle-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
  }

  .principle-header:hover {
    background: #f8fafc;
  }

  .principle-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .principle-number {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4A428E;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .principle-info h2 {
    font-size: 1.25rem;
    color: #1C2947;
    margin: 0;
  }

  .subcategory-count {
    font-size: 0.875rem;
    color: #64748b;
  }

  .expand-icon {
    color: #64748b;
  }

  .subcategories {
    border-top: 1px solid #e2e8f0;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .subcategory-card {
    background: #f8fafc;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    border: 1px solid #e2e8f0;
  }

  .subcategory-card.editing {
    border-color: #4A428E;
    background: white;
  }

  .subcategory-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .subcategory-info h3 {
    font-size: 1rem;
    color: #1C2947;
    margin: 0 0 0.5rem;
  }

  .subcategory-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .weight-badge {
    font-size: 0.75rem;
    background: #e2e8f0;
    color: #475569;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .custom-badge {
    font-size: 0.75rem;
    background: #4A428E;
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .subcategory-actions {
    display: flex;
    gap: 0.5rem;
  }

  .prompt-preview {
    background: white;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    border: 1px solid #e2e8f0;
  }

  .prompt-preview p {
    margin: 0;
    color: #475569;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .edit-form {
    margin-top: 1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: #1C2947;
    margin-bottom: 0.5rem;
  }

  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    line-height: 1.6;
    resize: vertical;
    font-family: inherit;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #4A428E;
    box-shadow: 0 0 0 3px rgba(74, 66, 142, 0.1);
  }

  .weight-group {
    max-width: 150px;
  }

  .form-group input[type="number"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
  }

  .form-group input[type="number"]:focus {
    outline: none;
    border-color: #4A428E;
    box-shadow: 0 0 0 3px rgba(74, 66, 142, 0.1);
  }

  .help-text {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0.5rem 0 0;
  }

  .edit-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  @media (max-width: 640px) {
    .page-header {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
    }

    .header-actions button {
      flex: 1;
    }

    h1 {
      font-size: 1.5rem;
    }

    .principle-header {
      padding: 1rem;
    }

    .subcategories {
      padding: 1rem;
    }

    .edit-actions {
      flex-direction: column;
    }

    .edit-actions button {
      width: 100%;
      justify-content: center;
    }
  }
</style>
