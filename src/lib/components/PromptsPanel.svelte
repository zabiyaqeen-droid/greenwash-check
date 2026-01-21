<script lang="ts">
  import { onMount } from 'svelte';
  import { Save, RotateCcw, ChevronDown, ChevronUp, Edit3, X, Info, AlertTriangle } from 'lucide-svelte';

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

  let principles = $state<Principle[]>([]);
  let loading = $state(true);
  let error = $state('');
  let expandedPrinciples = $state<Set<number>>(new Set());
  let editingPrompt = $state<string | null>(null);
  let editedPromptText = $state('');
  let editedWeight = $state(0);
  let saving = $state(false);
  let saveMessage = $state('');

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
    expandedPrinciples = new Set(expandedPrinciples);
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
        await loadPrompts();
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

  onMount(() => {
    loadPrompts();
  });
</script>

<div class="prompts-panel">
  <div class="panel-header">
    <h3>Assessment Prompts</h3>
    <p class="panel-subtitle">Configure the AI prompts used to evaluate your documents against the Competition Bureau's 6 Principles</p>
  </div>

  {#if saveMessage}
    <div class="save-message" class:error={saveMessage.includes('Failed') || saveMessage.includes('Please log in')}>
      {saveMessage}
    </div>
  {/if}

  <div class="info-banner">
    <Info size={16} />
    <span>Each prompt tells the AI what to look for. Weight multipliers (0.1-3.0x) adjust how much each subcategory affects the overall score.</span>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading prompts...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <AlertTriangle size={20} />
      <p>{error}</p>
      <button class="btn-retry" onclick={loadPrompts}>Try Again</button>
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
              <span class="principle-name">{principle.name}</span>
              <span class="subcategory-count">{principle.subcategories.length} subcategories</span>
            </div>
            <div class="expand-icon">
              {#if expandedPrinciples.has(principle.id)}
                <ChevronUp size={20} />
              {:else}
                <ChevronDown size={20} />
              {/if}
            </div>
          </button>

          {#if expandedPrinciples.has(principle.id)}
            <div class="subcategories">
              {#each principle.subcategories as subcategory (subcategory.id)}
                <div class="subcategory-card" class:editing={editingPrompt === subcategory.id}>
                  <div class="subcategory-header">
                    <div class="subcategory-info">
                      <span class="subcategory-name">{subcategory.name}</span>
                      <div class="subcategory-meta">
                        <span class="weight-badge">Weight: {subcategory.weight}x</span>
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
                          <Edit3 size={16} />
                        </button>
                        {#if subcategory.isCustom}
                          <button 
                            class="btn-icon reset" 
                            onclick={() => resetPrompt(subcategory.id)}
                            title="Reset to default"
                          >
                            <RotateCcw size={16} />
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
                          rows="5"
                          placeholder="Enter the prompt that will guide the AI analysis..."
                        ></textarea>
                      </div>
                      
                      <div class="form-group weight-group">
                        <label for="weight-{subcategory.id}">Weight (multiplier)</label>
                        <input 
                          type="number" 
                          id="weight-{subcategory.id}"
                          bind:value={editedWeight}
                          min="0.1"
                          max="3.0"
                          step="0.1"
                        />
                        <span class="help-text">Higher values increase this subcategory's impact on the overall score.</span>
                      </div>

                      <div class="edit-actions">
                        <button 
                          class="btn-save" 
                          onclick={() => savePrompt(subcategory.id)}
                          disabled={saving}
                        >
                          {#if saving}
                            Saving...
                          {:else}
                            <Save size={14} /> Save
                          {/if}
                        </button>
                        <button class="btn-cancel" onclick={cancelEditing}>
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  {:else}
                    <div class="prompt-preview">
                      <p>{subcategory.prompt.slice(0, 200)}{subcategory.prompt.length > 200 ? '...' : ''}</p>
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

<style>
  .prompts-panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .panel-header {
    margin-bottom: 1rem;
  }

  .panel-header h3 {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
    color: #1C2947;
  }

  .panel-subtitle {
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
  }

  .save-message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    background: #ECFDF5;
    color: #065F46;
    font-size: 0.9rem;
  }

  .save-message.error {
    background: #FEF2F2;
    color: #991B1B;
  }

  .info-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #F0F9FF;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: #0369A1;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    color: #64748b;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #E2E8F0;
    border-top-color: #4A428E;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 0.5rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    color: #DC2626;
    text-align: center;
  }

  .btn-retry {
    background: #DC2626;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .principles-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .principle-card {
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow: hidden;
  }

  .principle-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #F8FAFC;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .principle-header:hover {
    background: #F1F5F9;
  }

  .principle-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .principle-number {
    font-size: 0.75rem;
    font-weight: 600;
    color: #4A428E;
    background: #EDE9FE;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .principle-name {
    font-weight: 600;
    color: #1C2947;
    font-size: 0.9rem;
  }

  .subcategory-count {
    font-size: 0.75rem;
    color: #64748b;
  }

  .expand-icon {
    color: #64748b;
  }

  .subcategories {
    border-top: 1px solid #E2E8F0;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .subcategory-card {
    background: #FAFAFA;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 0.75rem;
  }

  .subcategory-card.editing {
    background: #FFFBEB;
    border-color: #FCD34D;
  }

  .subcategory-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .subcategory-info {
    flex: 1;
  }

  .subcategory-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: #1C2947;
    display: block;
    margin-bottom: 0.25rem;
  }

  .subcategory-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .weight-badge {
    font-size: 0.7rem;
    background: #E0E7FF;
    color: #4338CA;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .custom-badge {
    font-size: 0.7rem;
    background: #DCFCE7;
    color: #166534;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .subcategory-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 0.35rem;
    border-radius: 4px;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    background: #E2E8F0;
    color: #1C2947;
  }

  .btn-icon.reset:hover {
    background: #FEE2E2;
    color: #DC2626;
  }

  .prompt-preview {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #E2E8F0;
  }

  .prompt-preview p {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
    line-height: 1.5;
  }

  .edit-form {
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid #FCD34D;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-group label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: #1C2947;
    margin-bottom: 0.25rem;
  }

  .form-group textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.85rem;
    font-family: inherit;
    resize: vertical;
  }

  .form-group textarea:focus {
    outline: none;
    border-color: #4A428E;
    box-shadow: 0 0 0 2px rgba(74, 66, 142, 0.1);
  }

  .weight-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .weight-group input {
    width: 80px;
    padding: 0.4rem 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .weight-group input:focus {
    outline: none;
    border-color: #4A428E;
  }

  .help-text {
    font-size: 0.75rem;
    color: #64748b;
  }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-save {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #356904;
    color: white;
    border: none;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-save:hover:not(:disabled) {
    background: #2d5a03;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-cancel {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: #F1F5F9;
    color: #64748b;
    border: 1px solid #E2E8F0;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-cancel:hover {
    background: #E2E8F0;
    color: #1C2947;
  }
</style>
