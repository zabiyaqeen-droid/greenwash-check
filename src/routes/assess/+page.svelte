<script lang="ts">
  import { user } from '$lib/stores/user';
  import { criteria, defaultDimensions, type Dimension, type Criterion } from '$lib/stores/criteria';
  import { assessmentHistory } from '$lib/stores/assessment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Upload, FileText, Settings2, Play, Loader2, ChevronDown, ChevronUp, RotateCcw, AlertCircle, CheckCircle, Info, X, File, Award, AlertTriangle, ExternalLink, Sparkles, Shield, DollarSign, Scale, TrendingDown } from 'lucide-svelte';
  
  let inputText = $state('');
  let showCriteriaPanel = $state(false);
  let expandedDimensions = $state<Set<string>>(new Set());
  let uploadedFile = $state<File | null>(null);
  let uploadedFileId = $state<string | null>(null);
  let uploadedFilePath = $state<string | null>(null);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadError = $state('');
  let fileInputRef: HTMLInputElement;
  let inputMode = $state<'text' | 'document'>('document');
  
  let isAnalyzing = $state(false);
  let analysisProgress = $state(0);
  let analysisStage = $state('');
  let analysisError = $state('');
  let analysisTimer: ReturnType<typeof setInterval> | null = null;
  
  let result = $state<any>(null);
  let currentUser = $state<any>(null);
  let dimensions = $state<Dimension[]>(JSON.parse(JSON.stringify(defaultDimensions)));
  
  // Expanded sections state
  let expandedIssues = $state<Set<number>>(new Set());
  let expandedPositives = $state<Set<number>>(new Set());
  
  onMount(() => {
    user.init();
    user.subscribe(u => {
      currentUser = u;
      if (!u) goto('/login');
    });
    criteria.subscribe(d => {
      dimensions = d;
    });
  });
  
  function toggleDimensionExpand(dimId: string) {
    if (expandedDimensions.has(dimId)) {
      expandedDimensions.delete(dimId);
    } else {
      expandedDimensions.add(dimId);
    }
    expandedDimensions = new Set(expandedDimensions);
  }
  
  function toggleIssueExpand(id: number) {
    if (expandedIssues.has(id)) {
      expandedIssues.delete(id);
    } else {
      expandedIssues.add(id);
    }
    expandedIssues = new Set(expandedIssues);
  }
  
  function togglePositiveExpand(id: number) {
    if (expandedPositives.has(id)) {
      expandedPositives.delete(id);
    } else {
      expandedPositives.add(id);
    }
    expandedPositives = new Set(expandedPositives);
  }
  
  // Progress stages for document analysis
  const documentStages = [
    'Uploading document to AI analysis engine...',
    'AI is reading document structure and layout...',
    'Detecting images, charts, and infographics...',
    'Processing visual elements with computer vision...',
    'Extracting data from charts and graphs...',
    'Scanning for environmental terminology...',
    'Identifying key environmental claims...',
    'Cross-referencing with Bill C-59 requirements...',
    'Assessing truthfulness against Competition Bureau principles...',
    'Evaluating substantiation and evidence quality...',
    'Checking for vague or misleading language...',
    'Analysing scope and specificity of claims...',
    'Reviewing comparisons and baselines...',
    'Assessing lifecycle considerations...',
    'Identifying potential material omissions...',
    'Evaluating third-party verification claims...',
    'Scoring against Competition Bureau 6 Principles...',
    'Identifying top issues and recommendations...',
    'Recognizing best practices and positives...',
    'Compiling legal risk assessment...',
    'Finalising comprehensive assessment report...'
  ];
  
  const textStages = [
    'Analysing environmental claim...',
    'Checking against Bill C-59 requirements...',
    'Evaluating substantiation...',
    'Assessing clarity and specificity...',
    'Generating recommendations...'
  ];
  
  function startAnalysisProgress(isDocument: boolean) {
    const stages = isDocument ? documentStages : textStages;
    const totalTime = isDocument ? 180000 : 30000;
    const stageTime = totalTime / stages.length;
    let stageIndex = 0;
    
    analysisProgress = 0;
    analysisStage = stages[0];
    
    analysisTimer = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) {
        analysisStage = stages[stageIndex];
        analysisProgress = Math.min(95, (stageIndex / stages.length) * 100);
      }
    }, stageTime);
  }
  
  function stopAnalysisProgress() {
    if (analysisTimer) {
      clearInterval(analysisTimer);
      analysisTimer = null;
    }
    analysisProgress = 100;
  }
  
  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    const validTypes = ['.pdf', '.docx', '.txt'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExt)) {
      uploadError = 'Please upload a PDF, DOCX, or TXT file.';
      return;
    }
    
    if (file.size > 30 * 1024 * 1024) {
      uploadError = 'File size must be less than 30MB.'
      return;
    }
    
    uploadError = '';
    isUploading = true;
    uploadProgress = 0;
    uploadedFile = file;
    inputMode = 'document';
    inputText = '';
    
    try {
      // Use chunked upload for files larger than 3MB to avoid serverless limits
      const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
      const fileId = crypto.randomUUID();
      
      if (file.size > CHUNK_SIZE) {
        // Chunked upload for large files
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', i.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('fileId', fileId);
          formData.append('fileName', file.name);
          
          const response = await fetch('/api/upload-chunk', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }
          
          const result = await response.json();
          uploadProgress = Math.round(((i + 1) / totalChunks) * 100);
          
          if (result.complete) {
            uploadedFileId = result.fileId;
            uploadedFilePath = result.filePath;
          }
        }
      } else {
        // Regular upload for small files
        const formData = new FormData();
        formData.append('file', file);
        
        const progressInterval = setInterval(() => {
          if (uploadProgress < 90) uploadProgress += 10;
        }, 200);
        
        const response = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData
        });
        
        clearInterval(progressInterval);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        
        const uploadResult = await response.json();
        uploadedFileId = uploadResult.fileId;
        uploadedFilePath = uploadResult.filePath || uploadResult.blobUrl;
        uploadProgress = 100;
      }
      
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Upload failed';
      uploadedFile = null;
    } finally {
      isUploading = false;
    }
  }
  
  function removeFile() {
    uploadedFile = null;
    uploadedFileId = null;
    uploadedFilePath = null;
    uploadProgress = 0;
    uploadError = '';
    if (fileInputRef) fileInputRef.value = '';
  }
  
  async function runAssessment() {
    if (!inputText && !uploadedFilePath) {
      analysisError = 'Please enter text or upload a document.';
      return;
    }
    
    isAnalyzing = true;
    analysisError = '';
    result = null;
    
    const isDocument = inputMode === 'document' && uploadedFilePath;
    startAnalysisProgress(isDocument);
    
    try {
      const enabledCriteria = dimensions
        .filter(d => d.enabled)
        .flatMap(d => d.criteria.filter(c => c.enabled));
      
      let response;
      if (isDocument) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 900000);
        
        response = await fetch('/api/analyze-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: uploadedFilePath,
            fileId: uploadedFileId,
            fileName: uploadedFile?.name || 'document.pdf',
            dimensions: dimensions.filter(d => d.enabled)
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
      } else {
        response = await fetch('/api/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            criteria: enabledCriteria
          })
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Assessment failed');
      }
      
      const responseData = await response.json();
      
      // Handle both direct result and wrapped assessment response
      result = responseData.assessment || responseData;
      
      assessmentHistory.add({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        inputType: isDocument ? 'document' : 'text',
        inputPreview: isDocument ? uploadedFile?.name || 'Document' : inputText.slice(0, 100),
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        summary: result.executiveSummary || result.summary,
        dimensions: result.principleScores || result.dimensions,
        keyFindings: result.top20Issues?.slice(0, 5).map((i: any) => i.title) || result.keyFindings,
        recommendations: result.top20Issues?.slice(0, 5).map((i: any) => i.recommendation) || result.recommendations
      });
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        analysisError = 'Analysis timed out. Please try with a smaller document.';
      } else {
        analysisError = err instanceof Error ? err.message : 'Assessment failed';
      }
    } finally {
      stopAnalysisProgress();
      isAnalyzing = false;
    }
  }
  
  function startNewAssessment() {
    result = null;
    inputText = '';
    removeFile();
    inputMode = 'document';
    analysisError = '';
    expandedIssues = new Set();
    expandedPositives = new Set();
  }
  
  function getRiskColor(level: string) {
    if (level?.toLowerCase().includes('low')) return '#27AE60';
    if (level?.toLowerCase().includes('medium')) return '#F39C12';
    return '#E74C3C';
  }
  
  function getScoreColor(score: number) {
    if (score >= 70) return '#27AE60';
    if (score >= 40) return '#F39C12';
    return '#E74C3C';
  }
  
  function getStatusColor(status: string) {
    if (status === 'Compliant') return '#27AE60';
    if (status === 'Needs Attention') return '#F39C12';
    return '#E74C3C';
  }
  
  function getRiskLevelColor(level: string) {
    if (level === 'Low') return '#27AE60';
    if (level === 'Medium') return '#F39C12';
    return '#E74C3C';
  }
</script>

<div class="assess-page">
  <div class="container">
    <h1>Greenwashing Risk Assessment</h1>
    <p class="subtitle">Upload your sustainability report or environmental claims for AI-powered analysis against Canadian Bill C-59 and Competition Bureau guidelines.</p>
    
    <!-- Free Tool Banner -->
    <div class="free-tool-banner">
      <div class="free-banner-content">
        <div class="free-badge-large">100% Free</div>
        <div class="free-banner-text">
          <p><strong>This tool is completely free.</strong> We make Greenwash Check free to support companies in being compliant and to protect consumers from false advertising. Our mission is to protect the integrity of ESG and sustainability.</p>
        </div>
      </div>
      <div class="support-us-section">
        <span class="support-label">Want to help?</span>
        <div class="support-actions">
          <a href="https://www.linkedin.com/company/muuvment/" target="_blank" rel="noopener" class="support-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Follow us
          </a>
          <button type="button" class="support-btn" onclick={() => { if (typeof navigator !== 'undefined' && navigator.share) { navigator.share({title: 'Greenwash Check', text: 'Free Bill C-59 greenwashing assessment tool', url: window.location.origin}); } else { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.origin), '_blank'); } }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <a href="mailto:info@muuvment.com?subject=Greenwash Check Feedback" class="support-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Feedback
          </a>
        </div>
      </div>
    </div>
    
    <!-- Risk Warning Banner -->
    <div class="risk-banner">
      <div class="risk-banner-header">
        <AlertTriangle size={24} />
        <h3>The Cost of Greenwashing</h3>
      </div>
      <div class="risk-stats">
        <div class="risk-stat">
          <DollarSign size={20} />
          <div>
            <span class="stat-value">$10M - $15M</span>
            <span class="stat-label">Maximum penalties under Bill C-59</span>
          </div>
        </div>
        <div class="risk-stat">
          <TrendingDown size={20} />
          <div>
            <span class="stat-value">30%+</span>
            <span class="stat-label">Brand value loss from greenwashing scandals</span>
          </div>
        </div>
        <div class="risk-stat">
          <Scale size={20} />
          <div>
            <span class="stat-value">Rising</span>
            <span class="stat-label">Class action lawsuits for misleading claims</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="quick-actions">
      <button 
        class="quick-action-btn settings"
        class:active={showCriteriaPanel}
        onclick={() => showCriteriaPanel = !showCriteriaPanel}
      >
        <Settings2 size={18} />
        Assessment Criteria
        {#if showCriteriaPanel}
          <ChevronUp size={16} />
        {:else}
          <ChevronDown size={16} />
        {/if}
      </button>
    </div>
    
    <!-- Criteria Panel -->
    {#if showCriteriaPanel}
      <div class="criteria-panel">
        <div class="criteria-header">
          <h3>Competition Bureau's 6 Principles</h3>
          <p class="criteria-subtitle">Configure which principles and criteria to assess against</p>
          <button class="reset-btn" onclick={() => criteria.reset()}>
            <RotateCcw size={14} />
            Reset to Default
          </button>
        </div>
        
        <div class="dimensions-list">
          {#each dimensions as dim}
            <div class="dimension-section" class:disabled={!dim.enabled}>
              <button class="dimension-header" onclick={() => toggleDimensionExpand(dim.id)}>
                <div class="dimension-left">
                  <input 
                    type="checkbox" 
                    checked={dim.enabled}
                    onclick={(e) => { e.stopPropagation(); criteria.toggleDimension(dim.id); }}
                  />
                  <div class="dimension-info">
                    <span class="dimension-name">{dim.name}</span>
                    <span class="dimension-principle">{dim.principle}</span>
                  </div>
                </div>
                <div class="dimension-right">
                  <span class="criteria-count">{dim.criteria.filter(c => c.enabled).length}/{dim.criteria.length} criteria</span>
                  {#if expandedDimensions.has(dim.id)}
                    <ChevronUp size={20} />
                  {:else}
                    <ChevronDown size={20} />
                  {/if}
                </div>
              </button>
              
              {#if expandedDimensions.has(dim.id)}
                <div class="criteria-list">
                  {#if dim.legalReference}
                    <div class="legal-reference">
                      <Scale size={14} />
                      <span>{dim.legalReference}</span>
                    </div>
                  {/if}
                  {#each dim.criteria as crit}
                    <div class="criterion-item" class:disabled={!crit.enabled}>
                      <div class="criterion-main">
                        <input 
                          type="checkbox" 
                          checked={crit.enabled}
                          onchange={() => criteria.toggleCriterion(dim.id, crit.id)}
                        />
                        <div class="criterion-content">
                          <span class="criterion-name">{crit.name}</span>
                          <p class="criterion-description">{crit.description}</p>
                          {#if crit.legalBasis}
                            <p class="criterion-legal">{crit.legalBasis}</p>
                          {/if}
                        </div>
                      </div>
                      <div class="criterion-importance">
                        <span class="importance-label">Importance:</span>
                        <div class="importance-buttons">
                          <button 
                            class="importance-btn"
                            class:active={crit.importance === 'high'}
                            style="--btn-color: #E74C3C"
                            onclick={() => criteria.setImportance(dim.id, crit.id, 'high')}
                          >High</button>
                          <button 
                            class="importance-btn"
                            class:active={crit.importance === 'medium'}
                            style="--btn-color: #F39C12"
                            onclick={() => criteria.setImportance(dim.id, crit.id, 'medium')}
                          >Medium</button>
                          <button 
                            class="importance-btn"
                            class:active={crit.importance === 'low'}
                            style="--btn-color: #27AE60"
                            onclick={() => criteria.setImportance(dim.id, crit.id, 'low')}
                          >Low</button>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Input Section -->
    <div class="input-section">
      <div class="input-tabs">
        <button 
          class="tab-btn" 
          class:active={inputMode === 'document'}
          onclick={() => inputMode = 'document'}
        >
          <Upload size={18} />
          Upload Document
        </button>
        <button 
          class="tab-btn" 
          class:active={inputMode === 'text'}
          onclick={() => inputMode = 'text'}
        >
          <FileText size={18} />
          Paste Text
        </button>
      </div>
      
      {#if inputMode === 'document'}
        <div class="document-upload">
          {#if !uploadedFile}
            <label class="dropzone">
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onchange={handleFileUpload}
                bind:this={fileInputRef}
                hidden
              />
              <Upload size={48} />
              <p class="dropzone-title">Drop your document here</p>
              <p class="dropzone-subtitle">or click to browse</p>
              <span class="dropzone-formats">PDF, DOCX, or TXT (max 30MB, up to 200 pages)</span>
            </label>
          {:else}
            <div class="uploaded-file">
              <div class="file-info">
                <File size={32} />
                <div class="file-details">
                  <span class="file-name">{uploadedFile.name}</span>
                  <span class="file-size">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  {#if uploadProgress === 100}
                    <span class="file-status success">
                      <CheckCircle size={14} />
                      Ready for analysis
                    </span>
                  {:else if isUploading}
                    <span class="file-status uploading">
                      <Loader2 size={14} class="spin" />
                      Uploading... {uploadProgress}%
                    </span>
                  {/if}
                </div>
              </div>
              <button class="remove-file-btn" onclick={removeFile}>
                <X size={20} />
              </button>
            </div>
          {/if}
          
          {#if uploadError}
            <div class="error-message">
              <AlertCircle size={16} />
              {uploadError}
            </div>
          {/if}
          
          {#if uploadedFile && uploadProgress === 100}
            <div class="document-note">
              <Info size={18} />
              <span>The full document including images, charts, and graphics will be analysed by our AI against the Competition Bureau's 6 Principles. Documents up to 200 pages are fully supported.</span>
            </div>
          {/if}
        </div>
      {:else}
        <div class="text-area">
          <textarea 
            class="text-input"
            bind:value={inputText}
            placeholder="Paste your environmental claim or marketing text here..."
            rows="6"
          ></textarea>
          <p class="char-count">{inputText.length} characters</p>
        </div>
      {/if}
      
      <button 
        class="run-btn"
        onclick={runAssessment}
        disabled={isAnalyzing || (!inputText && !uploadedFilePath)}
      >
        {#if isAnalyzing}
          <Loader2 size={20} class="spin" />
          Analysing...
        {:else}
          <Play size={20} />
          Run Assessment
        {/if}
      </button>
    </div>
    
    <!-- Progress Section -->
    {#if isAnalyzing}
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {analysisProgress}%"></div>
        </div>
        <p class="progress-stage">{analysisStage}</p>
        <p class="progress-note">Large documents may take several minutes to analyse thoroughly.</p>
      </div>
    {/if}
    
    <!-- Error Section -->
    {#if analysisError}
      <div class="error-section">
        <AlertCircle size={20} />
        <span>{analysisError}</span>
      </div>
    {/if}
    
    <!-- Results Section -->
    {#if result}
      <div class="results-section">
        <div class="results-header">
          <h2>Assessment Report Card</h2>
          <button class="new-assessment-btn" onclick={startNewAssessment}>
            <RotateCcw size={16} />
            New Assessment
          </button>
        </div>
        
        <!-- Metadata -->
        {#if result.metadata}
          <div class="metadata-bar">
            <span>Document: {result.metadata.fileName}</span>
            <span>Pages Analyzed: {result.metadata.pagesAnalyzed}/{result.metadata.totalPages}</span>
            <span>Processing Time: {result.metadata.processingTimeSeconds}s</span>
            <span>Framework: {result.metadata.framework}</span>
          </div>
        {/if}
        
        <!-- Overall Score -->
        <div class="score-card" style="border-left-color: {getScoreColor(result.overallScore)}">
          <div class="score-main">
            <div class="score-circle" style="color: {getScoreColor(result.overallScore)}">
              <span class="score-number">{result.overallScore}</span>
              <span class="score-max">/ 100</span>
            </div>
            <div class="score-info">
              <span class="risk-badge" style="background: {getRiskColor(result.riskLevel)}">
                {result.riskLevel}
              </span>
              <p class="score-summary">{result.executiveSummary || result.summary}</p>
            </div>
          </div>
        </div>
        
        <!-- Legal Risk Assessment -->
        {#if result.legalRiskAssessment}
          <div class="legal-risk-section">
            <h3><Shield size={20} /> Legal Risk Assessment</h3>
            <div class="legal-risk-grid">
              <div class="legal-risk-item">
                <span class="legal-label">Potential Penalty Exposure</span>
                <span class="legal-value">{result.legalRiskAssessment.penaltyExposure}</span>
              </div>
              <div class="legal-risk-item">
                <span class="legal-label">Enforcement Risk Level</span>
                <span class="legal-value risk-level" style="color: {getRiskLevelColor(result.legalRiskAssessment.enforcementRisk)}">{result.legalRiskAssessment.enforcementRisk}</span>
              </div>
            </div>
            {#if result.legalRiskAssessment.priorityActions}
              <div class="priority-actions">
                <h4>Priority Actions</h4>
                <ol>
                  {#each result.legalRiskAssessment.priorityActions as action}
                    <li>{action}</li>
                  {/each}
                </ol>
              </div>
            {/if}
          </div>
        {/if}
        
        <!-- Detailed Principle & Subcategory Scores -->
        {#if result.principleScores && result.principleScores.length > 0}
          <div class="principles-detailed">
            <h3>Competition Bureau 6 Principles - Detailed Assessment</h3>
            <p class="section-intro">Each principle and subcategory is scored individually with specific evidence and recommendations from your document.</p>
            
            {#each result.principleScores as principle, pIdx}
              <div class="principle-section">
                <button class="principle-section-header" onclick={() => toggleDimensionExpand(principle.id || `p${pIdx}`)}>
                  <div class="principle-section-left">
                    <span class="principle-number">{pIdx + 1}</span>
                    <div class="principle-section-info">
                      <span class="principle-section-name">{principle.name}</span>
                      <span class="principle-section-desc">{principle.principle}</span>
                    </div>
                  </div>
                  <div class="principle-section-right">
                    <span class="principle-section-score" style="color: {getScoreColor(principle.overallScore || principle.score)}">
                      {principle.overallScore || principle.score}/100
                    </span>
                    <span class="principle-section-status" style="background: {getStatusColor(principle.status)}">
                      {principle.status}
                    </span>
                    {#if expandedDimensions.has(principle.id || `p${pIdx}`)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </div>
                </button>
                
                {#if expandedDimensions.has(principle.id || `p${pIdx}`)}
                  <div class="principle-section-content">
                    {#if principle.summary}
                      <p class="principle-summary">{principle.summary}</p>
                    {/if}
                    
                    <!-- Subcategories -->
                    {#if principle.subcategories && principle.subcategories.length > 0}
                      <div class="subcategories-list">
                        {#each principle.subcategories as sub, sIdx}
                          <div class="subcategory-item" class:compliant={sub.status === 'Compliant'} class:attention={sub.status === 'Needs Attention'} class:risk={sub.status === 'High Risk'}>
                            <div class="subcategory-header">
                              <div class="subcategory-info">
                                <span class="subcategory-name">{sub.name}</span>
                                <span class="subcategory-status" style="background: {getStatusColor(sub.status)}">{sub.status}</span>
                              </div>
                              <span class="subcategory-score" style="color: {getScoreColor(sub.score)}">{sub.score}/100</span>
                            </div>
                            
                            <div class="subcategory-bar">
                              <div class="subcategory-fill" style="width: {sub.score}%; background: {getScoreColor(sub.score)}"></div>
                            </div>
                            
                            <div class="subcategory-rationale">
                              <h5>Assessment Rationale</h5>
                              <p>{sub.rationale}</p>
                            </div>
                            
                            {#if sub.evidence && sub.evidence.length > 0}
                              <div class="subcategory-evidence">
                                <h5>Evidence from Document</h5>
                                {#each sub.evidence as ev}
                                  <div class="evidence-item">
                                    <blockquote class="evidence-quote">"{ev.quote}"</blockquote>
                                    <div class="evidence-meta">
                                      <span class="evidence-page">{ev.pageReference}</span>
                                      {#if ev.context}
                                        <span class="evidence-context">{ev.context}</span>
                                      {/if}
                                    </div>
                                  </div>
                                {/each}
                              </div>
                            {/if}
                            
                            {#if sub.recommendations && sub.recommendations.length > 0}
                              <div class="subcategory-recommendations">
                                <h5>Recommendations</h5>
                                <ul>
                                  {#each sub.recommendations as rec}
                                    <li>{rec}</li>
                                  {/each}
                                </ul>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {:else if principle.finding}
                      <p class="principle-finding-text">{principle.finding}</p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Key Strengths -->
        {#if result.keyStrengths && result.keyStrengths.length > 0}
          <div class="positives-section">
            <h3><Award size={20} /> Key Strengths</h3>
            <p class="section-intro">These practices demonstrate good environmental claim standards and should be continued.</p>
            <div class="positives-list">
              {#each result.keyStrengths as strength, idx}
                <div class="positive-item">
                  <button class="positive-header" onclick={() => togglePositiveExpand(idx)}>
                    <div class="positive-left">
                      <CheckCircle size={20} class="positive-icon" />
                      <div class="positive-info">
                        <span class="positive-title">{strength.title}</span>
                        {#if strength.pageReference}
                          <span class="positive-principle">{strength.pageReference}</span>
                        {/if}
                      </div>
                    </div>
                    {#if expandedPositives.has(idx)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </button>
                  {#if expandedPositives.has(idx)}
                    <div class="positive-details">
                      <p class="positive-description">{strength.description}</p>
                      {#if strength.evidence}
                        <blockquote class="positive-quote">"{strength.evidence}"</blockquote>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Critical Issues -->
        {#if result.criticalIssues && result.criticalIssues.length > 0}
          <div class="issues-section">
            <h3><AlertTriangle size={20} /> Critical Issues ({result.criticalIssues.length})</h3>
            <p class="section-intro">These issues should be addressed urgently to reduce greenwashing risk and ensure Bill C-59 compliance.</p>
            <div class="issues-list">
              {#each result.criticalIssues as issue, idx}
                <div class="issue-item high">
                  <button class="issue-header" onclick={() => toggleIssueExpand(idx)}>
                    <div class="issue-left">
                      <span class="issue-number">{idx + 1}</span>
                      <div class="issue-info">
                        <span class="issue-title">{issue.title}</span>
                        <div class="issue-meta">
                          <span class="issue-risk" style="background: #E74C3C">Critical</span>
                          <span class="issue-principle">{issue.principle}</span>
                        </div>
                      </div>
                    </div>
                    {#if expandedIssues.has(idx)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </button>
                  {#if expandedIssues.has(idx)}
                    <div class="issue-details">
                      <p class="issue-description">{issue.description}</p>
                      {#if issue.evidence}
                        <blockquote class="issue-quote">"{issue.evidence}"</blockquote>
                      {/if}
                      {#if issue.pageReference}
                        <p class="issue-page">Location: {issue.pageReference}</p>
                      {/if}
                      {#if issue.recommendation}
                        <div class="issue-recommendation">
                          <h5>Recommendation</h5>
                          <p>{issue.recommendation}</p>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Legacy support for top5Positives -->
        {#if !result.keyStrengths && result.top5Positives && result.top5Positives.length > 0}
          <div class="positives-section">
            <h3><Award size={20} /> Top 5 Things Done Well</h3>
            <p class="section-intro">These practices demonstrate good environmental claim standards and should be continued.</p>
            <div class="positives-list">
              {#each result.top5Positives as positive}
                <div class="positive-item">
                  <button class="positive-header" onclick={() => togglePositiveExpand(positive.id)}>
                    <div class="positive-left">
                      <CheckCircle size={20} class="positive-icon" />
                      <div class="positive-info">
                        <span class="positive-title">{positive.title}</span>
                        <span class="positive-principle">{positive.principle}</span>
                      </div>
                    </div>
                    {#if expandedPositives.has(positive.id)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </button>
                  {#if expandedPositives.has(positive.id)}
                    <div class="positive-details">
                      <p class="positive-description">{positive.description}</p>
                      {#if positive.quote}
                        <blockquote class="positive-quote">"{positive.quote}"</blockquote>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Legacy support for top20Issues -->
        {#if !result.criticalIssues && result.top20Issues && result.top20Issues.length > 0}
          <div class="issues-section">
            <h3><AlertTriangle size={20} /> Issues to Address ({result.top20Issues.length})</h3>
            <p class="section-intro">These issues should be addressed to reduce greenwashing risk and ensure Bill C-59 compliance.</p>
            <div class="issues-list">
              {#each result.top20Issues as issue}
                <div class="issue-item" class:high={issue.riskLevel === 'High'} class:medium={issue.riskLevel === 'Medium'} class:low={issue.riskLevel === 'Low'}>
                  <button class="issue-header" onclick={() => toggleIssueExpand(issue.id)}>
                    <div class="issue-left">
                      <span class="issue-number">{issue.id}</span>
                      <div class="issue-info">
                        <span class="issue-title">{issue.title}</span>
                        <div class="issue-meta">
                          <span class="issue-risk" style="background: {getRiskLevelColor(issue.riskLevel)}">{issue.riskLevel} Risk</span>
                          <span class="issue-principle">{issue.principle}</span>
                        </div>
                      </div>
                    </div>
                    {#if expandedIssues.has(issue.id)}
                      <ChevronUp size={20} />
                    {:else}
                      <ChevronDown size={20} />
                    {/if}
                  </button>
                  {#if expandedIssues.has(issue.id)}
                    <div class="issue-details">
                      <p class="issue-description">{issue.description}</p>
                      {#if issue.quote}
                        <blockquote class="issue-quote">"{issue.quote}"</blockquote>
                      {/if}
                      {#if issue.pageReference}
                        <p class="issue-page">Location: {issue.pageReference}</p>
                      {/if}
                      <div class="issue-recommendation">
                        <h5>Recommendation</h5>
                        <p>{issue.recommendation}</p>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Muuvment IQ CTA -->
        <div class="muuvment-iq-cta">
          <div class="cta-content">
            <Sparkles size={32} class="cta-icon" />
            <div class="cta-text">
              <h3>Ready to Take Action on These Findings?</h3>
              <p>Learn why the most advanced sustainability teams are using <strong>Muuvment IQ</strong> to reclaim their time and deliver exceptional sustainability results.</p>
              <p class="value-prop">Get personalised guidance on addressing compliance gaps, improving environmental communications, and maintaining ongoing Bill C-59 compliance.</p>
            </div>
          </div>
          <a href="https://app.muuvment.com/ai/assistant" target="_blank" rel="noopener noreferrer" class="cta-button">
            Try Muuvment IQ
            <ExternalLink size={16} />
          </a>
          <p class="cta-note">Free trial available — no login or credit card required</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .assess-page {
    min-height: calc(100vh - 200px);
    padding: 2rem 1rem;
    background: #F8FAF8;
  }
  
  .container {
    max-width: 1000px;
    margin: 0 auto;
  }
  
  h1 {
    font-size: 2rem;
    color: #2C3E50;
    margin-bottom: 0.5rem;
  }
  
  .subtitle {
    color: #5A6A7A;
    margin-bottom: 1.5rem;
  }
  
  /* Free Tool Banner */
  .free-tool-banner {
    background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
    border: 1px solid #86EFAC;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .free-banner-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-width: 280px;
  }
  
  .free-badge-large {
    background: linear-gradient(135deg, #0D9488 0%, #059669 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
  }
  
  .free-banner-text p {
    margin: 0;
    color: #166534;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  
  .free-banner-text strong {
    color: #15803D;
  }
  
  .support-us-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .support-label {
    color: #166534;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .support-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .support-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: white;
    border: 1px solid #86EFAC;
    border-radius: 6px;
    color: #166534;
    font-size: 0.8rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .support-btn:hover {
    background: #166534;
    color: white;
    border-color: #166534;
  }
  
  .support-btn svg {
    flex-shrink: 0;
  }
  
  /* Risk Warning Banner */
  .risk-banner {
    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
    border: 1px solid #F59E0B;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .risk-banner-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    color: #92400E;
  }
  
  .risk-banner-header h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  
  .risk-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .risk-stat {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: #78350F;
  }
  
  .risk-stat div {
    display: flex;
    flex-direction: column;
  }
  
  .stat-value {
    font-weight: 700;
    font-size: 1.1rem;
  }
  
  .stat-label {
    font-size: 0.85rem;
    opacity: 0.9;
  }
  
  .quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .quick-action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .quick-action-btn:hover {
    border-color: #6B8E6B;
    background: #F0FFF0;
  }
  
  .quick-action-btn.settings {
    margin-left: auto;
  }
  
  .quick-action-btn.settings.active {
    background: #6B8E6B;
    color: white;
    border-color: #6B8E6B;
  }
  
  /* Criteria Panel */
  .criteria-panel {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .criteria-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #E0E0E0;
  }
  
  .criteria-header h3 {
    margin: 0;
    color: #2C3E50;
  }
  
  .criteria-subtitle {
    flex: 1;
    margin: 0;
    color: #7F8C8D;
    font-size: 0.9rem;
  }
  
  .reset-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: none;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    color: #5A6A7A;
    cursor: pointer;
    font-size: 0.85rem;
  }
  
  .reset-btn:hover {
    border-color: #6B8E6B;
    color: #6B8E6B;
  }
  
  .dimensions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .dimension-section {
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .dimension-section.disabled {
    opacity: 0.6;
  }
  
  .dimension-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #F8F9FA;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
    border: none;
    text-align: left;
    font-family: inherit;
  }
  
  .dimension-header:hover {
    background: #F0F4F0;
  }
  
  .dimension-left {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .dimension-left input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #6B8E6B;
    margin-top: 2px;
  }
  
  .dimension-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .dimension-name {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .dimension-principle {
    font-size: 0.85rem;
    color: #5A6A7A;
    font-style: italic;
  }
  
  .dimension-right {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #7F8C8D;
  }
  
  .criteria-count {
    font-size: 0.85rem;
  }
  
  .criteria-list {
    border-top: 1px solid #E0E0E0;
  }
  
  .legal-reference {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #F0F4FF;
    font-size: 0.85rem;
    color: #3B5998;
    border-bottom: 1px solid #E0E0E0;
  }
  
  .criterion-item {
    padding: 1rem;
    border-bottom: 1px solid #F0F0F0;
  }
  
  .criterion-item:last-child {
    border-bottom: none;
  }
  
  .criterion-item.disabled {
    opacity: 0.5;
  }
  
  .criterion-main {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .criterion-main input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #6B8E6B;
    margin-top: 2px;
  }
  
  .criterion-content {
    flex: 1;
  }
  
  .criterion-name {
    font-weight: 500;
    color: #2C3E50;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .criterion-description {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: #5A6A7A;
    line-height: 1.5;
  }
  
  .criterion-legal {
    margin: 0;
    font-size: 0.8rem;
    color: #3B5998;
    font-style: italic;
  }
  
  .criterion-importance {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: 2rem;
  }
  
  .importance-label {
    font-size: 0.8rem;
    color: #7F8C8D;
  }
  
  .importance-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .importance-btn {
    padding: 0.25rem 0.75rem;
    border: 1px solid #E0E0E0;
    border-radius: 4px;
    background: white;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .importance-btn:hover {
    border-color: var(--btn-color);
  }
  
  .importance-btn.active {
    background: var(--btn-color);
    color: white;
    border-color: var(--btn-color);
  }
  
  /* Input Section */
  .input-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .input-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #F8F9FA;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #5A6A7A;
  }
  
  .tab-btn.active {
    background: #F0FFF0;
    border-color: #6B8E6B;
    color: #6B8E6B;
  }
  
  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    border: 2px dashed #D0D0D0;
    border-radius: 12px;
    background: #FAFAFA;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .dropzone:hover {
    border-color: #6B8E6B;
    background: #F0FFF0;
  }
  
  .dropzone :global(svg) {
    color: #6B8E6B;
    margin-bottom: 1rem;
  }
  
  .dropzone-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #2C3E50;
    margin: 0;
  }
  
  .dropzone-subtitle {
    color: #6B8E6B;
    margin: 0.5rem 0 1rem;
  }
  
  .dropzone-formats {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 20px;
    font-size: 0.85rem;
    color: #5A6A7A;
  }
  
  .uploaded-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: #F0FFF0;
    border: 2px solid #6B8E6B;
    border-radius: 12px;
  }
  
  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: #6B8E6B;
  }
  
  .file-details {
    display: flex;
    flex-direction: column;
  }
  
  .file-name {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .file-size {
    font-size: 0.875rem;
    color: #7F8C8D;
  }
  
  .file-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    margin-top: 0.25rem;
  }
  
  .file-status.success {
    color: #27AE60;
  }
  
  .file-status.uploading {
    color: #F39C12;
  }
  
  .remove-file-btn {
    background: none;
    border: none;
    color: #7F8C8D;
    cursor: pointer;
    padding: 0.5rem;
  }
  
  .remove-file-btn:hover {
    color: #E74C3C;
  }
  
  .document-note {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: #F8F9FA;
    border-radius: 8px;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #5A6A7A;
  }
  
  .document-note :global(svg) {
    flex-shrink: 0;
    color: #6B8E6B;
  }
  
  .text-input {
    width: 100%;
    padding: 1rem;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 1rem;
    resize: vertical;
    font-family: inherit;
  }
  
  .text-input:focus {
    outline: none;
    border-color: #6B8E6B;
  }
  
  .char-count {
    text-align: right;
    font-size: 0.8rem;
    color: #7F8C8D;
    margin-top: 0.5rem;
  }
  
  .run-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 300px;
    margin: 1.5rem auto 0;
    padding: 1rem 2rem;
    background: #6B8E6B;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .run-btn:hover:not(:disabled) {
    background: #5A7A5A;
  }
  
  .run-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .progress-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .progress-bar {
    height: 8px;
    background: #E0E0E0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: #6B8E6B;
    transition: width 0.3s;
  }
  
  .progress-stage {
    margin: 1rem 0 0.5rem;
    color: #2C3E50;
    font-weight: 500;
  }
  
  .progress-note {
    font-size: 0.875rem;
    color: #7F8C8D;
    margin: 0;
  }
  
  .error-section, .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #FEE2E2;
    border: 1px solid #FECACA;
    border-radius: 8px;
    color: #DC2626;
    margin-bottom: 1rem;
  }
  
  /* Results Section */
  .results-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .results-header h2 {
    margin: 0;
  }
  
  .new-assessment-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #6B8E6B;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  .new-assessment-btn:hover {
    background: #5A7A5A;
  }
  
  .metadata-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: #F8F9FA;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    color: #5A6A7A;
  }
  
  .metadata-bar span {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .score-card {
    background: #F8FAF8;
    border-radius: 12px;
    padding: 1.5rem;
    border-left: 4px solid;
    margin-bottom: 2rem;
  }
  
  .score-main {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  
  .score-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }
  
  .score-number {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }
  
  .score-max {
    font-size: 0.9rem;
    color: #7F8C8D;
  }
  
  .score-info {
    flex: 1;
  }
  
  .risk-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    color: white;
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }
  
  .score-summary {
    margin: 0;
    color: #2C3E50;
    line-height: 1.6;
  }
  
  /* Legal Risk Section */
  .legal-risk-section {
    background: #FEF3F2;
    border: 1px solid #FECACA;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .legal-risk-section h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem;
    color: #991B1B;
  }
  
  .legal-risk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .legal-risk-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .legal-label {
    font-size: 0.85rem;
    color: #7F1D1D;
  }
  
  .legal-value {
    font-weight: 600;
    color: #991B1B;
  }
  
  .legal-value.risk-level {
    font-size: 1.1rem;
  }
  
  .priority-actions {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .priority-actions h4 {
    margin: 0 0 0.75rem;
    color: #991B1B;
    font-size: 0.95rem;
  }
  
  .priority-actions ol {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .priority-actions li {
    margin-bottom: 0.5rem;
    color: #7F1D1D;
  }
  
  /* Detailed Principles Assessment */
  .principles-detailed {
    margin-bottom: 2rem;
  }
  
  .principles-detailed h3 {
    margin: 0 0 0.5rem;
    color: #2C3E50;
  }
  
  .principle-section {
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 12px;
    margin-bottom: 1rem;
    overflow: hidden;
  }
  
  .principle-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem;
    width: 100%;
    background: #F8F9FA;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    gap: 1rem;
  }
  
  .principle-section-header:hover {
    background: #F0F4F0;
  }
  
  .principle-section-left {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    flex: 1;
  }
  
  .principle-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #6B8E6B;
    color: white;
    border-radius: 50%;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }
  
  .principle-section-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .principle-section-name {
    font-weight: 600;
    color: #2C3E50;
    font-size: 1rem;
  }
  
  .principle-section-desc {
    font-size: 0.85rem;
    color: #5A6A7A;
  }
  
  .principle-section-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }
  
  .principle-section-score {
    font-weight: 700;
    font-size: 1.25rem;
  }
  
  .principle-section-status {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .principle-section-content {
    padding: 1.5rem;
    border-top: 1px solid #E0E0E0;
  }
  
  .principle-summary {
    margin: 0 0 1.5rem;
    color: #2C3E50;
    line-height: 1.6;
    padding: 1rem;
    background: #F8F9FA;
    border-radius: 8px;
    border-left: 3px solid #6B8E6B;
  }
  
  .principle-finding-text {
    margin: 0;
    color: #5A6A7A;
    line-height: 1.6;
  }
  
  /* Subcategories */
  .subcategories-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .subcategory-item {
    background: #FAFAFA;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    padding: 1.25rem;
  }
  
  .subcategory-item.compliant {
    border-left: 4px solid #27AE60;
  }
  
  .subcategory-item.attention {
    border-left: 4px solid #F39C12;
  }
  
  .subcategory-item.risk {
    border-left: 4px solid #E74C3C;
  }
  
  .subcategory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .subcategory-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .subcategory-name {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .subcategory-status {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    color: white;
    font-size: 0.7rem;
    font-weight: 500;
  }
  
  .subcategory-score {
    font-weight: 700;
    font-size: 1.1rem;
  }
  
  .subcategory-bar {
    height: 6px;
    background: #E0E0E0;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 1rem;
  }
  
  .subcategory-fill {
    height: 100%;
    transition: width 0.3s;
  }
  
  .subcategory-rationale,
  .subcategory-evidence,
  .subcategory-recommendations {
    margin-bottom: 1rem;
  }
  
  .subcategory-rationale h5,
  .subcategory-evidence h5,
  .subcategory-recommendations h5 {
    margin: 0 0 0.5rem;
    color: #5A6A7A;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .subcategory-rationale p {
    margin: 0;
    color: #2C3E50;
    line-height: 1.6;
  }
  
  .evidence-item {
    margin-bottom: 0.75rem;
  }
  
  .evidence-item:last-child {
    margin-bottom: 0;
  }
  
  .evidence-quote {
    margin: 0 0 0.5rem;
    padding: 0.75rem 1rem;
    background: white;
    border-left: 3px solid #6B8E6B;
    font-style: italic;
    color: #2C3E50;
    font-size: 0.9rem;
  }
  
  .evidence-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
  }
  
  .evidence-page {
    color: #6B8E6B;
    font-weight: 600;
  }
  
  .evidence-context {
    color: #7F8C8D;
  }
  
  .subcategory-recommendations ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .subcategory-recommendations li {
    margin-bottom: 0.5rem;
    color: #2C3E50;
    line-height: 1.5;
  }
  
  .subcategory-recommendations li:last-child {
    margin-bottom: 0;
  }
  
  /* Positives Section */
  .positives-section {
    margin-bottom: 2rem;
  }
  
  .positives-section h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
    color: #27AE60;
  }
  
  .section-intro {
    margin: 0 0 1rem;
    color: #5A6A7A;
    font-size: 0.9rem;
  }
  
  .positives-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .positive-item {
    background: #F0FFF4;
    border: 1px solid #86EFAC;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .positive-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  
  .positive-left {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .positive-icon {
    color: #27AE60;
    flex-shrink: 0;
  }
  
  .positive-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .positive-title {
    font-weight: 600;
    color: #166534;
  }
  
  .positive-principle {
    font-size: 0.85rem;
    color: #15803D;
  }
  
  .positive-details {
    padding: 0 1rem 1rem 3rem;
    border-top: 1px solid #86EFAC;
    background: white;
  }
  
  .positive-description {
    margin: 1rem 0;
    color: #2C3E50;
    line-height: 1.6;
  }
  
  .positive-quote {
    margin: 0;
    padding: 0.75rem 1rem;
    background: #F0FFF4;
    border-left: 3px solid #27AE60;
    font-style: italic;
    color: #166534;
  }
  
  /* Issues Section */
  .issues-section {
    margin-bottom: 2rem;
  }
  
  .issues-section h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
    color: #E74C3C;
  }
  
  .issues-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .issue-item {
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .issue-item.high {
    border-left: 4px solid #E74C3C;
  }
  
  .issue-item.medium {
    border-left: 4px solid #F39C12;
  }
  
  .issue-item.low {
    border-left: 4px solid #27AE60;
  }
  
  .issue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  }
  
  .issue-left {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .issue-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #F8F9FA;
    border-radius: 50%;
    font-weight: 600;
    font-size: 0.85rem;
    color: #5A6A7A;
    flex-shrink: 0;
  }
  
  .issue-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .issue-title {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .issue-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  
  .issue-risk {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .issue-principle {
    font-size: 0.85rem;
    color: #5A6A7A;
  }
  
  .issue-details {
    padding: 0 1rem 1rem 3.5rem;
    border-top: 1px solid #E0E0E0;
    background: #F8F9FA;
  }
  
  .issue-description {
    margin: 1rem 0;
    color: #2C3E50;
    line-height: 1.6;
  }
  
  .issue-quote {
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    background: white;
    border-left: 3px solid #E74C3C;
    font-style: italic;
    color: #7F1D1D;
  }
  
  .issue-page {
    margin: 0 0 1rem;
    font-size: 0.85rem;
    color: #5A6A7A;
  }
  
  .issue-recommendation {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #E0E0E0;
  }
  
  .issue-recommendation h5 {
    margin: 0 0 0.5rem;
    color: #6B8E6B;
    font-size: 0.9rem;
  }
  
  .issue-recommendation p {
    margin: 0;
    color: #2C3E50;
    line-height: 1.5;
  }
  
  /* Muuvment IQ CTA */
  .muuvment-iq-cta {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
    text-align: center;
  }
  
  .cta-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .cta-icon {
    color: #FCD34D;
  }
  
  .cta-text h3 {
    margin: 0 0 0.5rem;
    color: white;
    font-size: 1.25rem;
  }
  
  .cta-text p {
    margin: 0;
    color: #94A3B8;
    line-height: 1.6;
  }
  
  .cta-text .next-steps {
    margin-top: 1rem;
    font-style: italic;
  }
  
  .cta-text .free-trial-note {
    margin-top: 0.75rem;
    color: #FCD34D;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    background: #6B8E6B;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: background 0.2s;
  }
  
  .cta-button:hover {
    background: #5A7A5A;
  }
  
  .cta-note {
    color: #94A3B8;
    font-size: 0.85rem;
    margin: 0;
  }
  
  .value-prop {
    margin-top: 0.75rem !important;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  :global(.spin) {
    animation: spin 1s linear infinite;
  }
  
  @media (max-width: 768px) {
    .assess-page {
      padding: 1rem;
    }
    
    .page-header h1 {
      font-size: 1.5rem;
    }
    
    .page-header .subtitle {
      font-size: 0.9rem;
    }
    
    .free-tool-banner {
      padding: 1rem;
      flex-direction: column;
      text-align: center;
    }
    
    .support-buttons {
      flex-direction: column;
      width: 100%;
    }
    
    .support-btn {
      width: 100%;
      justify-content: center;
    }
    
    .quick-actions {
      flex-direction: column;
    }
    
    .quick-action-btn {
      width: 100%;
      justify-content: center;
    }
    
    .quick-action-btn.settings {
      margin-left: 0;
    }
    
    .criteria-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .dimension-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .dimension-right {
      margin-left: 2rem;
    }
    
    .criterion-importance {
      flex-direction: column;
      align-items: flex-start;
      margin-left: 2rem;
      margin-top: 0.5rem;
    }
    
    .document-upload {
      padding: 0;
    }
    
    .dropzone {
      padding: 2rem 1rem;
    }
    
    .dropzone-title {
      font-size: 1rem;
    }
    
    .run-btn {
      width: 100%;
      justify-content: center;
      padding: 1rem;
    }
    
    .score-main {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .score-circle {
      width: 100px;
      height: 100px;
    }
    
    .score-value {
      font-size: 2rem;
    }
    
    .risk-stats {
      grid-template-columns: 1fr;
    }
    
    .principle-cards {
      grid-template-columns: 1fr;
    }
    
    .issue-header, .positive-header {
      padding: 0.75rem;
    }
    
    .issue-details, .positive-details {
      padding: 0.75rem;
      padding-left: 1rem;
    }
    
    .muuvment-iq-cta {
      padding: 1.5rem;
      flex-direction: column;
      text-align: center;
    }
    
    .cta-button {
      width: 100%;
      justify-content: center;
    }
  }
  
  @media (max-width: 480px) {
    .page-header h1 {
      font-size: 1.25rem;
    }
    
    .uploaded-file {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .file-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
