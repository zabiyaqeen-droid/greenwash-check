<script lang="ts">
  import { onMount } from 'svelte';
  import { assessmentHistory, type AssessmentResult } from '$lib/stores/assessment';
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';

  let history: AssessmentResult[] = [];

  onMount(() => {
    user.init();
    assessmentHistory.init();
    
    const unsubUser = user.subscribe(u => {
      if (!u) goto('/login');
    });

    const unsubHistory = assessmentHistory.subscribe(h => {
      history = h;
    });

    return () => {
      unsubUser();
      unsubHistory();
    };
  });

  function getRiskColor(level: string) {
    switch (level) {
      case 'Low': return '#27AE60';
      case 'Medium': return '#F39C12';
      case 'High': return '#E74C3C';
      default: return '#7F8C8D';
    }
  }

  function formatDate(timestamp: string) {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>Assessment History | Greenwash Check</title>
</svelte:head>

<div class="history-page">
  <div class="container">
    <h1>Assessment History</h1>
    <p class="subtitle">Review your previous greenwashing assessments</p>

    {#if history.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h2>No assessments yet</h2>
        <p>Your assessment history will appear here once you've analysed some claims.</p>
        <a href="/assess" class="btn btn-primary">Start Assessment</a>
      </div>
    {:else}
      <div class="history-list">
        {#each history as assessment}
          <div class="history-card">
            <div class="card-header">
              <span class="date">{formatDate(assessment.timestamp)}</span>
              <span class="type-badge">{assessment.inputType === 'document' ? '📄 Document' : '📝 Text'}</span>
            </div>
            
            <div class="card-body">
              <div class="score-section">
                <div class="score" style="color: {getRiskColor(assessment.riskLevel)}">
                  {assessment.overallScore}
                </div>
                <span class="risk-label" style="background: {getRiskColor(assessment.riskLevel)}20; color: {getRiskColor(assessment.riskLevel)}">
                  {assessment.riskLevel} Risk
                </span>
              </div>
              
              <div class="content-section">
                <p class="preview">{assessment.inputPreview}</p>
                <p class="summary">{assessment.summary}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <button class="btn btn-secondary" on:click={() => assessmentHistory.clear()}>
        Clear History
      </button>
    {/if}
  </div>
</div>

<style>
  .history-page {
    padding: 3rem 1.5rem;
  }

  .container {
    max-width: 900px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #7F8C8D;
    margin-bottom: 2rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    color: #7F8C8D;
    margin-bottom: 1.5rem;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .history-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    overflow: hidden;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #F8F9FA;
    border-bottom: 1px solid #E0E0E0;
  }

  .date {
    color: #7F8C8D;
    font-size: 0.9rem;
  }

  .type-badge {
    font-size: 0.85rem;
    color: #5A6A7A;
  }

  .card-body {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .score-section {
    text-align: center;
    min-width: 80px;
  }

  .score {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .risk-label {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .content-section {
    flex: 1;
  }

  .preview {
    font-size: 0.9rem;
    color: #7F8C8D;
    margin: 0 0 0.5rem 0;
    font-style: italic;
  }

  .summary {
    margin: 0;
    color: #2C3E50;
  }

  .btn-secondary {
    background: transparent;
    color: #E74C3C;
    border: 1px solid #E74C3C;
  }

  .btn-secondary:hover {
    background: #FEE2E2;
  }
</style>
