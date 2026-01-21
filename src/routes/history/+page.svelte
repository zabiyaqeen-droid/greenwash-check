<script lang="ts">
  import { onMount } from 'svelte';
  import { assessmentHistory, type AssessmentResult } from '$lib/stores/assessment';
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';
  import { ChevronDown, ChevronUp, Trash2, Eye, Download, FileText, AlertTriangle, CheckCircle, X } from 'lucide-svelte';

  let history: AssessmentResult[] = $state([]);
  let selectedAssessment: AssessmentResult | null = $state(null);
  let showDeleteConfirm = $state(false);
  let assessmentToDelete: string | null = $state(null);

  onMount(() => {
    console.log('[History Page] onMount called');
    user.init();
    assessmentHistory.init();
    console.log('[History Page] Stores initialized');
    
    const unsubUser = user.subscribe(u => {
      console.log('[History Page] User subscription update:', !!u);
      if (!u) goto('/login');
    });

    const unsubHistory = assessmentHistory.subscribe(h => {
      console.log('[History Page] History subscription update, items:', h?.length);
      history = h || [];
    });

    return () => {
      unsubUser();
      unsubHistory();
    };
  });

  function getRiskColor(level: string) {
    if (level?.toLowerCase().includes('low')) return '#27AE60';
    if (level?.toLowerCase().includes('medium')) return '#F39C12';
    if (level?.toLowerCase().includes('high')) return '#E74C3C';
    return '#7F8C8D';
  }

  function getScoreColor(score: number) {
    if (score >= 70) return '#27AE60';
    if (score >= 40) return '#F39C12';
    return '#E74C3C';
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

  function viewAssessment(assessment: AssessmentResult) {
    selectedAssessment = assessment;
  }

  function closeAssessment() {
    selectedAssessment = null;
  }

  function confirmDelete(id: string) {
    assessmentToDelete = id;
    showDeleteConfirm = true;
  }

  function deleteAssessment() {
    if (assessmentToDelete) {
      assessmentHistory.delete(assessmentToDelete);
      assessmentToDelete = null;
      showDeleteConfirm = false;
      if (selectedAssessment?.id === assessmentToDelete) {
        selectedAssessment = null;
      }
    }
  }

  function cancelDelete() {
    assessmentToDelete = null;
    showDeleteConfirm = false;
  }

  function downloadPDF(assessment: AssessmentResult) {
    // Navigate to assess page with the assessment data to use the PDF generation there
    // For now, store in sessionStorage and redirect
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('viewAssessment', JSON.stringify(assessment));
      goto('/assess?view=' + assessment.id);
    }
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
              <div class="header-actions">
                <span class="type-badge">{assessment.inputType === 'document' ? '📄 Document' : '📝 Text'}</span>
              </div>
            </div>
            
            <div class="card-body">
              <div class="score-section">
                <div class="score" style="color: {getScoreColor(assessment.overallScore)}">
                  {assessment.overallScore}
                </div>
                <span class="risk-label" style="background: {getRiskColor(assessment.riskLevel)}20; color: {getRiskColor(assessment.riskLevel)}">
                  {assessment.riskLevel} Risk
                </span>
              </div>
              
              <div class="content-section">
                <p class="preview">{assessment.fileName || assessment.inputPreview}</p>
                <p class="summary">{assessment.summary?.slice(0, 200)}{assessment.summary?.length > 200 ? '...' : ''}</p>
                
                {#if assessment.principleScores}
                  <div class="quick-stats">
                    <span class="stat">
                      <FileText size={14} />
                      {assessment.principleScores.length} Principles
                    </span>
                    {#if assessment.top20Issues}
                      <span class="stat warning">
                        <AlertTriangle size={14} />
                        {assessment.top20Issues.length} Issues
                      </span>
                    {/if}
                    {#if assessment.claimsAnalyzed}
                      <span class="stat">
                        <CheckCircle size={14} />
                        {assessment.claimsAnalyzed} Claims
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>

            <div class="card-footer">
              <button class="action-btn view-btn" onclick={() => viewAssessment(assessment)}>
                <Eye size={16} />
                View Full Report
              </button>
              <button class="action-btn delete-btn" onclick={() => confirmDelete(assessment.id)}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        {/each}
      </div>

      <button class="btn btn-secondary" onclick={() => { showDeleteConfirm = true; assessmentToDelete = 'all'; }}>
        Clear All History
      </button>
    {/if}
  </div>
</div>

<!-- Full Assessment Modal -->
{#if selectedAssessment}
  <div class="modal-overlay" onclick={closeAssessment}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Assessment Report</h2>
        <button class="close-btn" onclick={closeAssessment}>
          <X size={24} />
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Header Info -->
        <div class="report-header">
          <div class="report-meta">
            <span class="report-date">{formatDate(selectedAssessment.timestamp)}</span>
            <span class="report-file">{selectedAssessment.fileName || selectedAssessment.inputPreview}</span>
          </div>
          <div class="report-score">
            <span class="score-value" style="color: {getScoreColor(selectedAssessment.overallScore)}">
              {selectedAssessment.overallScore}/100
            </span>
            <span class="risk-badge" style="background: {getRiskColor(selectedAssessment.riskLevel)}">
              {selectedAssessment.riskLevel} Risk
            </span>
          </div>
        </div>

        <!-- Executive Summary -->
        {#if selectedAssessment.executiveSummary || selectedAssessment.summary}
          <div class="report-section">
            <h3>Executive Summary</h3>
            <p>{selectedAssessment.executiveSummary || selectedAssessment.summary}</p>
          </div>
        {/if}

        <!-- Principle Scores -->
        {#if selectedAssessment.principleScores && selectedAssessment.principleScores.length > 0}
          <div class="report-section">
            <h3>Principle Scores</h3>
            <div class="principles-grid">
              {#each selectedAssessment.principleScores as principle}
                <div class="principle-card">
                  <div class="principle-header">
                    <span class="principle-name">{principle.principle}</span>
                    <span class="principle-score" style="color: {getScoreColor(principle.score)}">
                      {principle.score}/100
                    </span>
                  </div>
                  <p class="principle-desc">{principle.description}</p>
                  
                  {#if principle.subcategories && principle.subcategories.length > 0}
                    <div class="subcategories">
                      {#each principle.subcategories as sub}
                        <div class="subcategory">
                          <div class="sub-header">
                            <span class="sub-name">{sub.name}</span>
                            <span class="sub-score" style="color: {getScoreColor(sub.score)}">{sub.score}</span>
                          </div>
                          <p class="sub-rationale">{sub.rationale}</p>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Top Issues -->
        {#if selectedAssessment.top20Issues && selectedAssessment.top20Issues.length > 0}
          <div class="report-section">
            <h3>Key Issues ({selectedAssessment.top20Issues.length})</h3>
            <div class="issues-list">
              {#each selectedAssessment.top20Issues as issue, i}
                <div class="issue-card" class:high={issue.severity === 'High'} class:medium={issue.severity === 'Medium'}>
                  <div class="issue-header">
                    <span class="issue-number">#{i + 1}</span>
                    <span class="issue-title">{issue.title}</span>
                    <span class="severity-badge" class:high={issue.severity === 'High'} class:medium={issue.severity === 'Medium'}>
                      {issue.severity}
                    </span>
                  </div>
                  <p class="issue-desc">{issue.description}</p>
                  {#if issue.evidence}
                    <div class="issue-evidence">
                      <strong>Evidence:</strong> {issue.evidence}
                    </div>
                  {/if}
                  {#if issue.recommendation}
                    <div class="issue-recommendation">
                      <strong>Recommendation:</strong> {issue.recommendation}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Positive Findings -->
        {#if selectedAssessment.positiveFindings && selectedAssessment.positiveFindings.length > 0}
          <div class="report-section">
            <h3>Positive Findings ({selectedAssessment.positiveFindings.length})</h3>
            <div class="positives-list">
              {#each selectedAssessment.positiveFindings as positive}
                <div class="positive-card">
                  <h4>{positive.title}</h4>
                  <p>{positive.description}</p>
                  <span class="positive-principle">{positive.principle}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick={closeAssessment}>Close</button>
        <button class="btn btn-primary" onclick={() => downloadPDF(selectedAssessment!)}>
          <Download size={16} />
          Download PDF
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="modal-overlay" onclick={cancelDelete}>
    <div class="confirm-modal" onclick={(e) => e.stopPropagation()}>
      <h3>Confirm Delete</h3>
      <p>{assessmentToDelete === 'all' ? 'Are you sure you want to delete all assessment history?' : 'Are you sure you want to delete this assessment?'}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary" onclick={cancelDelete}>Cancel</button>
        <button class="btn btn-danger" onclick={() => { 
          if (assessmentToDelete === 'all') { 
            assessmentHistory.clear(); 
            showDeleteConfirm = false; 
          } else { 
            deleteAssessment(); 
          } 
        }}>Delete</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .history-page {
    padding: 3rem 1.5rem;
    min-height: 100vh;
    background: #f8f9fa;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 0.5rem;
    color: #1a365d;
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
    transition: box-shadow 0.2s;
  }

  .history-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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
    min-width: 100px;
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
    font-size: 1rem;
    color: #2C3E50;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  .summary {
    margin: 0 0 0.75rem 0;
    color: #5A6A7A;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .quick-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: #7F8C8D;
    background: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .stat.warning {
    background: #fef3c7;
    color: #92400e;
  }

  .card-footer {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: #fafafa;
    border-top: 1px solid #E0E0E0;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .view-btn {
    background: #27AE60;
    color: white;
  }

  .view-btn:hover {
    background: #219a52;
  }

  .delete-btn {
    background: transparent;
    color: #E74C3C;
    border: 1px solid #E74C3C;
  }

  .delete-btn:hover {
    background: #FEE2E2;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #27AE60;
    color: white;
  }

  .btn-primary:hover {
    background: #219a52;
  }

  .btn-secondary {
    background: transparent;
    color: #5A6A7A;
    border: 1px solid #E0E0E0;
  }

  .btn-secondary:hover {
    background: #f0f0f0;
  }

  .btn-danger {
    background: #E74C3C;
    color: white;
  }

  .btn-danger:hover {
    background: #c0392b;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #E0E0E0;
    background: #1a365d;
    color: white;
  }

  .modal-header h2 {
    margin: 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.25rem;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #E0E0E0;
    background: #fafafa;
  }

  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #E0E0E0;
  }

  .report-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .report-date {
    color: #7F8C8D;
    font-size: 0.9rem;
  }

  .report-file {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2C3E50;
  }

  .report-score {
    text-align: right;
  }

  .score-value {
    font-size: 2rem;
    font-weight: 700;
    display: block;
  }

  .risk-badge {
    display: inline-block;
    padding: 0.35rem 1rem;
    border-radius: 20px;
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }

  .report-section {
    margin-bottom: 2rem;
  }

  .report-section h3 {
    color: #1a365d;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #E0E0E0;
  }

  .principles-grid {
    display: grid;
    gap: 1rem;
  }

  .principle-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    border-left: 4px solid #27AE60;
  }

  .principle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .principle-name {
    font-weight: 600;
    color: #2C3E50;
  }

  .principle-score {
    font-weight: 700;
    font-size: 1.1rem;
  }

  .principle-desc {
    color: #5A6A7A;
    font-size: 0.9rem;
    margin: 0;
  }

  .subcategories {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #E0E0E0;
    display: grid;
    gap: 0.75rem;
  }

  .subcategory {
    background: white;
    padding: 0.75rem;
    border-radius: 6px;
  }

  .sub-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
  }

  .sub-name {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .sub-score {
    font-weight: 600;
  }

  .sub-rationale {
    color: #7F8C8D;
    font-size: 0.85rem;
    margin: 0;
  }

  .issues-list {
    display: grid;
    gap: 1rem;
  }

  .issue-card {
    background: #fff;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 1rem;
    border-left: 4px solid #7F8C8D;
  }

  .issue-card.high {
    border-left-color: #E74C3C;
    background: #fef2f2;
  }

  .issue-card.medium {
    border-left-color: #F39C12;
    background: #fffbeb;
  }

  .issue-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .issue-number {
    background: #E0E0E0;
    color: #5A6A7A;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .issue-title {
    flex: 1;
    font-weight: 600;
    color: #2C3E50;
  }

  .severity-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    background: #E0E0E0;
    color: #5A6A7A;
  }

  .severity-badge.high {
    background: #E74C3C;
    color: white;
  }

  .severity-badge.medium {
    background: #F39C12;
    color: white;
  }

  .issue-desc {
    color: #5A6A7A;
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
  }

  .issue-evidence, .issue-recommendation {
    font-size: 0.85rem;
    color: #5A6A7A;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(255,255,255,0.5);
    border-radius: 4px;
  }

  .positives-list {
    display: grid;
    gap: 1rem;
  }

  .positive-card {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 8px;
    padding: 1rem;
  }

  .positive-card h4 {
    margin: 0 0 0.5rem 0;
    color: #166534;
  }

  .positive-card p {
    margin: 0 0 0.5rem 0;
    color: #5A6A7A;
    font-size: 0.9rem;
  }

  .positive-principle {
    font-size: 0.8rem;
    color: #27AE60;
    font-weight: 500;
  }

  .confirm-modal {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
  }

  .confirm-modal h3 {
    margin: 0 0 1rem 0;
  }

  .confirm-modal p {
    color: #5A6A7A;
    margin-bottom: 1.5rem;
  }

  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .card-body {
      flex-direction: column;
    }

    .score-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .report-header {
      flex-direction: column;
      gap: 1rem;
    }

    .report-score {
      text-align: left;
    }
  }
</style>
