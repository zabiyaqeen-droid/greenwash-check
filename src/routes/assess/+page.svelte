<script lang="ts">
  import { user } from '$lib/stores/user';
  import { criteria, defaultDimensions, type Dimension, type Criterion } from '$lib/stores/criteria';
  import { assessmentHistory } from '$lib/stores/assessment';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Upload, FileText, Settings2, Play, Loader2, ChevronDown, ChevronUp, RotateCcw, AlertCircle, CheckCircle, Info, X, File, Award, AlertTriangle, ExternalLink, Sparkles, Shield, DollarSign, Scale, TrendingDown, Square, Mail, Send } from 'lucide-svelte';
  import PromptsPanel from '$lib/components/PromptsPanel.svelte';
  
  let inputText = $state('');
  let showPromptsPanel = $state(false);
  let expandedDimensions = $state<Set<string>>(new Set());
  let uploadedFile = $state<File | null>(null);
  let uploadedFileId = $state<string | null>(null);
  let uploadedFilePath = $state<string | null>(null);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let uploadError = $state('');
  let fileInputRef: HTMLInputElement;
  let inputMode = $state<'text' | 'document'>('document');
  let analysisMode = $state<'vision' | 'hybrid'>('hybrid'); // Default to hybrid (now uses multi-prompt architecture)
  
  let isAnalyzing = $state(false);
  let analysisProgress = $state(0);
  let analysisStage = $state('');
  let analysisError = $state('');
  let analysisTimer: ReturnType<typeof setInterval> | null = null;
  let abortController: AbortController | null = null;
  let analysisId = $state<string | null>(null);
  
  let result = $state<any>(null);
  let currentUser = $state<any>(null);
  let dimensions = $state<Dimension[]>(JSON.parse(JSON.stringify(defaultDimensions)));
  
  // Expanded sections state
  let expandedIssues = $state<Set<number>>(new Set());
  let expandedPositives = $state<Set<number>>(new Set());
  
  // Email modal state
  let showEmailModal = $state(false);
  let emailAddress = $state('');
  let isSendingEmail = $state(false);
  let emailSent = $state(false);
  let emailError = $state('');
  let emailAutoSent = $state(false); // Track if email was auto-sent on completion
let emailSubmitted = $state(false); // Track if user clicked submit to confirm email
  
  // Storage key for persisting analysis state
  const STORAGE_KEY = 'greenwash_check_analysis_state';
  
  // Save analysis state to localStorage
  function saveAnalysisState() {
    if (typeof window === 'undefined') return;
    const state = {
      isAnalyzing,
      analysisProgress,
      analysisStage,
      analysisId,
      inputText,
      inputMode,
      uploadedFilePath,
      uploadedFileId,
      uploadedFileName: uploadedFile?.name || null,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  
  // Load analysis state from localStorage
  function loadAnalysisState() {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      const state = JSON.parse(saved);
      // Only restore if less than 15 minutes old
      if (Date.now() - state.timestamp > 15 * 60 * 1000) {
        clearAnalysisState();
        return null;
      }
      return state;
    } catch {
      return null;
    }
  }
  
  // Clear analysis state from localStorage
  function clearAnalysisState() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
  
  onMount(() => {
    user.init();
    assessmentHistory.init(); // Initialize history store to ensure localStorage sync
    user.subscribe(u => {
      currentUser = u;
      if (!u) goto('/login');
    });
    criteria.subscribe(d => {
      dimensions = d;
    });
    
    // Check for any incomplete analysis state (user navigated away)
    const savedState = loadAnalysisState();
    if (savedState && savedState.isAnalyzing) {
      // Clear the stale state - analysis was cancelled when user left
      clearAnalysisState();
      // Show a message that the previous analysis was cancelled
      analysisError = 'Your previous analysis was cancelled because you left the page. Please start a new assessment.';
    }
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
    emailAutoSent = false; // Reset email sent status for new analysis
    
    const isDocument = inputMode === 'document' && uploadedFilePath;
    startAnalysisProgress(isDocument);
    
    try {
      const enabledCriteria = dimensions
        .filter(d => d.enabled)
        .flatMap(d => d.criteria.filter(c => c.enabled));
      
      let response;
      if (isDocument) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3600000); // 60 minute timeout
        
        const endpoint = analysisMode === 'hybrid' 
            ? '/api/analyze-document-hybrid' 
            : '/api/analyze-document';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: uploadedFilePath,
            fileId: uploadedFileId,
            fileName: uploadedFile?.name || 'document.pdf',
            dimensions: dimensions.filter(d => d.enabled),
            userId: currentUser?.id
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
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Assessment failed');
        } else {
          // Server returned HTML error page (e.g., 504 Gateway Timeout)
          if (response.status === 504) {
            throw new Error('The server took too long to respond. Please try again or use a smaller document.');
          } else if (response.status === 502) {
            throw new Error('Server temporarily unavailable. Please try again in a moment.');
          } else {
            throw new Error(`Server error (${response.status}). Please try again.`);
          }
        }
      }
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const responseData = await response.json();
      
      // Handle both direct result and wrapped assessment response
      result = responseData.assessment || responseData;
      
      // Store full assessment data for history access
      console.log('[Assess] Saving assessment to history, overallScore:', result.overallScore);
      assessmentHistory.add({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        inputType: isDocument ? 'document' : 'text',
        inputPreview: isDocument ? uploadedFile?.name || 'Document' : inputText.slice(0, 100),
        fileName: uploadedFile?.name,
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        summary: result.executiveSummary || result.summary,
        executiveSummary: result.executiveSummary,
        // Store full assessment data
        principleScores: result.principleScores,
        top20Issues: result.top20Issues,
        positiveFindings: result.positiveFindings,
        claimsAnalyzed: result.claimsAnalyzed,
        // Legacy fields
        dimensions: result.principleScores || result.dimensions,
        keyFindings: result.top20Issues?.slice(0, 5).map((i: any) => i.title) || result.keyFindings,
        recommendations: result.top20Issues?.slice(0, 5).map((i: any) => i.recommendation) || result.recommendations,
        // Metadata
        metadata: {
          fileName: uploadedFile?.name,
          pageCount: result.metadata?.pageCount,
          analysisMode: analysisMode,
          processingTime: result.metadata?.processingTime
        }
      });
      
      // Automatically send email if address was provided
      if (emailAddress && emailAddress.includes('@')) {
        try {
          await sendReportEmailAuto();
          emailAutoSent = true; // Mark as auto-sent for UI feedback
        } catch (emailErr) {
          console.error('Failed to send email automatically:', emailErr);
          // Don't show error to user - they can still manually send
          emailAutoSent = false;
        }
      }
      
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
  
  async function downloadReportAsPdf() {
    if (!result) return;
    
    try {
      // Use the structured PDF generation API
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: result.metadata?.fileName || uploadedFile?.name || 'Document',
          timestamp: new Date().toISOString(),
          overallScore: result.overallScore,
          riskLevel: result.riskLevel,
          executiveSummary: result.executiveSummary,
          summary: result.summary,
          principleScores: result.principleScores,
          top20Issues: result.top20Issues,
          positiveFindings: result.positiveFindings,
          claimsAnalyzed: result.claimsAnalyzed,
          metadata: result.metadata
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const { html, fileName } = await response.json();
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download the PDF report.');
        return;
      }
      
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load then trigger print
      printWindow.onload = () => {
        printWindow.print();
      };
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  }
  
  async function sendReportEmail() {
    if (!result || !emailAddress) return;
    
    isSendingEmail = true;
    emailError = '';
    
    try {
      const reportHtml = generateReportHtml();
      const documentName = result.metadata?.fileName || uploadedFile?.name || 'Document';
      
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          reportHtml,
          documentName,
          overallScore: result.overallScore,
          riskLevel: result.riskLevel
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      emailSent = true;
      setTimeout(() => {
        showEmailModal = false;
        emailSent = false;
        emailAddress = '';
      }, 3000);
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Failed to send email';
    } finally {
      isSendingEmail = false;
    }
  }
  
  function closeEmailModal() {
    showEmailModal = false;
    emailAddress = '';
    emailError = '';
    emailSent = false;
  }
  
  // Automatic email sending (silent, no UI updates)
  async function sendReportEmailAuto() {
    if (!result || !emailAddress) return;
    
    const reportHtml = generateReportHtml();
    const documentName = result.metadata?.fileName || uploadedFile?.name || 'Document';
    
    // Save email submission to database
    try {
      await fetch('/api/save-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailAddress,
          documentName,
          assessmentScore: result.overallScore,
          riskLevel: result.riskLevel
        })
      });
    } catch (saveErr) {
      console.error('Failed to save email submission:', saveErr);
    }
    
    const response = await fetch('/api/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailAddress,
        reportHtml,
        documentName,
        overallScore: result.overallScore,
        riskLevel: result.riskLevel
      })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send email');
    }
    
    // Don't clear email address - keep it visible for user reference
    // emailAddress = '';
  }
  
  function generateReportHtml(): string {
    const documentName = result.metadata?.fileName || uploadedFile?.name || 'Document';
    const date = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Pre-compute colors to avoid issues with template literals in style tags
    const scoreColor = getScoreColor(result.overallScore);
    const riskColor = getRiskColor(result.riskLevel);
    
    let issuesHtml = '';
    if (result.top20Issues && result.top20Issues.length > 0) {
      issuesHtml = result.top20Issues.map((issue: any, idx: number) => `
        <div class="issue-item">
          <h4>${idx + 1}. ${issue.title}</h4>
          <p><strong>Severity:</strong> ${issue.severity}</p>
          <p><strong>Location:</strong> ${issue.location || 'Not specified'}</p>
          <p><strong>Quote:</strong> "${issue.quote || 'N/A'}"</p>
          <p><strong>Issue:</strong> ${issue.issue}</p>
          <p><strong>Recommendation:</strong> ${issue.recommendation}</p>
        </div>
      `).join('');
    }
    
    let positivesHtml = '';
    if (result.positiveFindings && result.positiveFindings.length > 0) {
      positivesHtml = result.positiveFindings.map((pos: any, idx: number) => `
        <div class="positive-item">
          <h4>${idx + 1}. ${pos.title}</h4>
          <p>${pos.description}</p>
        </div>
      `).join('');
    }
    
    let principlesHtml = '';
    if (result.principleScores && result.principleScores.length > 0) {
      principlesHtml = result.principleScores.map((p: any, idx: number) => `
        <div class="principle-item">
          <h4>Principle ${idx + 1}: ${p.name}</h4>
          <p><strong>Score:</strong> ${p.overallScore || p.score}/100</p>
          <p><strong>Status:</strong> ${p.status}</p>
          ${p.subcategories ? p.subcategories.map((sub: any) => `
            <div class="subcategory">
              <p><strong>${sub.name}:</strong> ${sub.score}/50</p>
              <p>${sub.findings || ''}</p>
            </div>
          `).join('') : ''}
        </div>
      `).join('');
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Greenwash Check Report - ${documentName}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.6; }
          h1 { color: #1a365d; border-bottom: 3px solid #27AE60; padding-bottom: 10px; }
          h2 { color: #2d3748; margin-top: 30px; }
          h3 { color: #4a5568; }
          h4 { color: #2d3748; margin-bottom: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #27AE60; }
          .date { color: #718096; }
          .score-box { background: #f7fafc; border-left: 4px solid ` + scoreColor + `; padding: 20px; margin: 20px 0; }
          .score-number { font-size: 48px; font-weight: bold; color: ` + scoreColor + `; }
          .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; background: ` + riskColor + `; }
          .issue-item, .positive-item, .principle-item { background: #f7fafc; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .subcategory { margin-left: 20px; padding: 10px; background: #edf2f7; border-radius: 4px; margin-top: 8px; }
          .legal-section { background: #fff5f5; border-left: 4px solid #e53e3e; padding: 20px; margin: 20px 0; }
          .disclaimer { font-size: 12px; color: #718096; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Greenwash Check</div>
          <div class="date">${date}</div>
        </div>
        
        <h1>Assessment Report</h1>
        <p><strong>Document:</strong> ${documentName}</p>
        ${result.metadata ? `<p><strong>Pages Analyzed:</strong> ${result.metadata.pagesAnalyzed}/${result.metadata.totalPages}</p>` : ''}
        
        <div class="score-box">
          <div class="score-number">${result.overallScore}/100</div>
          <span class="risk-badge">${result.riskLevel}</span>
          <p>${result.executiveSummary || result.summary || ''}</p>
        </div>
        
        ${result.legalRiskAssessment ? `
          <div class="legal-section">
            <h2>Legal Risk Assessment</h2>
            <p><strong>Potential Penalty Exposure:</strong> ${result.legalRiskAssessment.penaltyExposure}</p>
            <p><strong>Enforcement Risk Level:</strong> ${result.legalRiskAssessment.enforcementRisk}</p>
            ${result.legalRiskAssessment.priorityActions ? `
              <h3>Priority Actions</h3>
              <ol>${result.legalRiskAssessment.priorityActions.map((a: string) => `<li>${a}</li>`).join('')}</ol>
            ` : ''}
          </div>
        ` : ''}
        
        <h2>Competition Bureau 6 Principles Assessment</h2>
        ${principlesHtml}
        
        <h2>Top Issues Identified</h2>
        ${issuesHtml || '<p>No significant issues identified.</p>'}
        
        <h2>Positive Findings</h2>
        ${positivesHtml || '<p>No specific positive findings noted.</p>'}
        
        <div class="disclaimer">
          <p><strong>Disclaimer:</strong> This report is generated by Greenwash Check, an AI-powered assessment tool. It provides informational analysis only and does not constitute legal or compliance advice. By using this service, you acknowledge that Muuvment Ltd. and its affiliates shall not be held liable for any damages arising from reliance on this assessment. This service is governed by the laws of the Province of Ontario, Canada.</p>
          <p>Generated by Greenwash Check | greenwash-check.onrender.com | © ${new Date().getFullYear()} Muuvment Ltd.</p>
        </div>
      </body>
      </html>
    `;
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
    
    <!-- Quick Actions -->
    <div class="quick-actions">
      <button 
        class="quick-action-btn settings"
        class:active={showPromptsPanel}
        onclick={() => showPromptsPanel = !showPromptsPanel}
      >
        <Settings2 size={18} />
        Configure Prompts
        {#if showPromptsPanel}
          <ChevronUp size={16} />
        {:else}
          <ChevronDown size={16} />
        {/if}
      </button>
      
      <!-- Analysis Mode Toggle -->
      <div class="analysis-mode-section">
        <div class="analysis-mode-toggle">
          <span class="toggle-label">Analysis Mode:</span>
          <button 
            class="mode-btn recommended"
            class:active={analysisMode === 'hybrid'}
            onclick={() => analysisMode = 'hybrid'}
          >
            <Sparkles size={16} />
            Hybrid (Recommended)
          </button>
          <button 
            class="mode-btn"
            class:active={analysisMode === 'vision'}
            onclick={() => analysisMode = 'vision'}
          >
            <FileText size={16} />
            Vision Only
          </button>
        </div>
        <div class="mode-info-box">
          <Info size={14} />
          {#if analysisMode === 'hybrid'}
            <span><strong>Hybrid (Recommended):</strong> Extracts text and uses Vision AI for charts/images. Uses dedicated claim extraction followed by 18 parallel subcategory assessments for most accurate analysis.</span>
          {:else}
            <span><strong>Vision Only:</strong> Processes every page as an image using Vision AI. Best for image-heavy documents, infographics, or when text extraction fails. Uses multi-prompt architecture for detailed analysis.</span>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Prompts Configuration Panel -->
    {#if showPromptsPanel}
      <PromptsPanel />
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
      
      <!-- Email for report delivery -->
      <div class="email-delivery-section">
        <div class="email-delivery-header">
          <Mail size={18} />
          <span>Get your report via email</span>
          {#if emailAutoSent}
            <span class="email-sent-badge">
              <CheckCircle size={14} />
              Sent!
            </span>
          {/if}
        </div>
        <div class="email-input-row">
          <input
            type="email"
            class="email-delivery-input"
            class:email-sent={emailAutoSent}
            placeholder="Enter your email address"
            bind:value={emailAddress}
            disabled={isAnalyzing || emailAutoSent}
          />
          <button 
            class="email-submit-btn"
            disabled={!emailAddress || !emailAddress.includes('@') || isAnalyzing || emailAutoSent}
            onclick={() => {
              if (emailAddress && emailAddress.includes('@')) {
                emailSubmitted = true;
                // Show brief confirmation
                setTimeout(() => { emailSubmitted = false; }, 3000);
              }
            }}
          >
            {#if emailAutoSent}
              <CheckCircle size={16} />
              Sent
            {:else if emailSubmitted}
              <CheckCircle size={16} />
              Confirmed
            {:else}
              Submit
            {/if}
          </button>
        </div>
        {#if emailAutoSent}
          <span class="email-sent-text">Report sent to this email</span>
        {:else if emailSubmitted}
          <span class="email-confirmed-text">Email confirmed! Report will be sent after assessment.</span>
        {/if}
        <div class="assessment-info-box">
          <Info size={16} />
          <div class="assessment-info-text">
            <p><strong>Before you start:</strong></p>
            <ul>
              <li>Analysis can take up to <strong>30 minutes</strong> for large documents</li>
              <li><strong>Do not leave this page</strong> until the assessment is complete</li>
              <li>If you provide an email, the report will be sent automatically when ready</li>
            </ul>
          </div>
        </div>
      </div>
      
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
    
    <!-- Progress Section (moved above disclaimer) -->
    {#if isAnalyzing}
      <div class="progress-section">
        <div class="stay-on-page-warning">
          <AlertTriangle size={20} />
          <span><strong>Important:</strong> Please stay on this page until the analysis is complete. Navigating away will cancel the assessment.</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: {analysisProgress}%"></div>
        </div>
        <p class="progress-stage">{analysisStage}</p>
        <p class="progress-note">Large documents may take several minutes to analyse thoroughly. You can minimise this window but please do not close it.</p>
      </div>
    {/if}
    
    <!-- Disclaimer and Privacy Notice (always visible) -->
    <div class="pre-assessment-disclaimer">
      <div class="disclaimer-header">
        <AlertTriangle size={18} />
        <h4>Important Notice & Privacy</h4>
      </div>
      <div class="disclaimer-content">
        <p>
          <strong>Your privacy matters.</strong> Your data is only accessed and used to deliver this service. 
          We respect your privacy and <strong>do not use your documents or data to train AI models</strong>. 
          Your assessments remain confidential.
        </p>
        <p>
          While we have taken considerable effort to incorporate relevant laws, regulations, and best practices into 
          this assessment tool, <strong>artificial intelligence can make mistakes</strong>. It is essential that you 
          review and validate all information before relying on it for business, legal, or compliance decisions.
        </p>
        <p>
          <strong>This assessment does not constitute legal advice.</strong> For specific guidance regarding Bill C-59, 
          the Competition Act, or environmental claims compliance, please consult with a qualified legal professional.
        </p>
        <p class="liability-text">
          By using this service, you acknowledge that Muuvment Ltd. and its affiliates shall not be held liable for any 
          damages arising from reliance on this assessment tool. This tool provides informational analysis only. 
          No warranty is made regarding accuracy or fitness for purpose. This service and any disputes arising from its 
          use are subject to the laws of the Province of Ontario and the federal laws of Canada applicable therein. 
          By using this service, you agree to attorn to the exclusive jurisdiction of the courts of the Province of Ontario, Canada.
        </p>
      </div>
    </div>
    
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
          <div class="results-actions">
            <button class="download-pdf-btn" onclick={downloadReportAsPdf}>
              <FileText size={16} />
              Download PDF
            </button>
            <button class="email-report-btn" onclick={() => showEmailModal = true}>
              <Mail size={16} />
              Email Report
            </button>
            <button class="new-assessment-btn" onclick={startNewAssessment}>
              <RotateCcw size={16} />
              New Assessment
            </button>
          </div>
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
        
        <!-- Disclaimer -->
        <div class="assessment-disclaimer">
          <h4>Important Notice</h4>
          <p>
            While we have taken considerable effort to incorporate relevant laws, regulations, and best practices into 
            this assessment tool, <strong>artificial intelligence can make mistakes</strong>. It is essential that you 
            review and validate all information before relying on it for business, legal, or compliance decisions.
          </p>
          <p>
            <strong>This assessment does not constitute legal advice.</strong> For specific guidance regarding Bill C-59, 
            the Competition Act, or environmental claims compliance, please consult with a qualified legal professional.
          </p>
          <p class="liability-text">
            By using this service, you acknowledge that Muuvment Ltd. and its affiliates shall not be held liable for any damages arising from reliance on this assessment tool. This tool provides informational analysis only and does not constitute legal or compliance advice. No warranty is made regarding accuracy or fitness for purpose. By using this service, you agree to attorn to the exclusive jurisdiction of the courts of the Province of Ontario, Canada, and that this agreement shall be governed by the laws of Ontario and the federal laws of Canada applicable therein.
          </p>
        </div>
        
        <!-- Muuvment IQ CTA -->
        <!-- Muuvment IQ Promotional Section -->
        <div class="muuvment-iq-promo">
          <div class="promo-divider"></div>
          <div class="promo-content">
            <h3 class="promo-title">Need More Comprehensive ESG Support?</h3>
            <p class="promo-description">Learn why the most innovative sustainability teams are using <strong>Muuvment IQ</strong> to reclaim their time and deliver exceptional sustainability results.</p>
            <a href="https://app.muuvment.com/ai/assistant" target="_blank" rel="noopener noreferrer" class="promo-button">
              Try Muuvment IQ
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    {/if}

  </div>
</div>

<!-- Email Report Modal -->
{#if showEmailModal}
  <div class="modal-overlay" onclick={closeEmailModal}>
    <div class="email-modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3><Mail size={20} /> Email Report</h3>
        <button class="modal-close" onclick={closeEmailModal}>
          <X size={20} />
        </button>
      </div>
      
      {#if emailSent}
        <div class="email-success">
          <CheckCircle size={48} />
          <h4>Report Sent Successfully!</h4>
          <p>The assessment report has been sent to <strong>{emailAddress}</strong></p>
        </div>
      {:else}
        <div class="modal-body">
          <p>Enter the email address where you'd like to receive the full assessment report.</p>
          
          <div class="email-input-group">
            <label for="email-input">Email Address</label>
            <input 
              id="email-input"
              type="email" 
              bind:value={emailAddress}
              placeholder="recipient@example.com"
              disabled={isSendingEmail}
            />
          </div>
          
          {#if emailError}
            <div class="email-error">
              <AlertCircle size={16} />
              <span>{emailError}</span>
            </div>
          {/if}
          
          <div class="modal-actions">
            <button class="cancel-btn" onclick={closeEmailModal} disabled={isSendingEmail}>
              Cancel
            </button>
            <button 
              class="send-btn" 
              onclick={sendReportEmail}
              disabled={isSendingEmail || !emailAddress}
            >
              {#if isSendingEmail}
                <Loader2 size={16} class="spin" />
                Sending...
              {:else}
                <Send size={16} />
                Send Report
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

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
    background: linear-gradient(135deg, #356904 0%, #2A5403 100%);
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
  
  /* Analysis Mode Toggle */
  .analysis-mode-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    background: #F5F5F5;
    border-radius: 20px;
  }
  
  .toggle-label {
    font-size: 0.85rem;
    color: #666;
    padding: 0 0.5rem;
  }
  
  .mode-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: 16px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }
  
  .mode-btn:hover {
    background: #E8E8E8;
  }
  
  .mode-btn.active {
    background: #6B8E6B;
    color: white;
  }
  
  .analysis-mode-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .mode-info-box {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #F0F7F0;
    border: 1px solid #D4E5D4;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #4A5A4A;
    line-height: 1.4;
  }
  
  .mode-info-box :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
    color: #6B8E6B;
  }
  
  .mode-info-box strong {
    color: #2C3E50;
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
  
  .stay-on-page-warning {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #FEF3C7;
    border: 1px solid #FCD34D;
    border-radius: 8px;
    color: #92400E;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .stay-on-page-warning :global(svg) {
    flex-shrink: 0;
    color: #D97706;
  }
  
  .stay-on-page-warning strong {
    color: #78350F;
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
  
  .results-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  
  .download-pdf-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2563EB;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .download-pdf-btn:hover {
    background: #1D4ED8;
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
    color: #CBD5E1;
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
    color: #CBD5E1;
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
  
  /* Legal Disclaimer */
  .legal-disclaimer {
    margin-top: 3rem;
    padding: 1.5rem;
    background: #F8F9FA;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #5A6A7A;
    line-height: 1.6;
  }
  
  .legal-disclaimer h4 {
    margin: 0 0 1rem;
    color: #2C3E50;
    font-size: 0.95rem;
    font-weight: 600;
  }
  
  .legal-disclaimer p {
    margin: 0 0 1rem;
  }
  
  .legal-disclaimer p:last-child {
    margin-bottom: 0;
  }
  
  .legal-disclaimer strong {
    color: #2C3E50;
  }
  
  .legal-disclaimer .jurisdiction {
    padding-top: 1rem;
    border-top: 1px solid #E0E0E0;
    font-style: italic;
  }
  
  /* Email Report Button */
  .email-report-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .email-report-btn:hover {
    background: #047857;
  }
  
  /* Email Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .email-modal {
    background: white;
    border-radius: 12px;
    max-width: 450px;
    width: 100%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: #F8FAF8;
    border-bottom: 1px solid #E0E0E0;
  }
  
  .modal-header h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #2C3E50;
    font-size: 1.1rem;
  }
  
  .modal-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #7F8C8D;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .modal-close:hover {
    background: #E0E0E0;
    color: #2C3E50;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .modal-body > p {
    margin: 0 0 1.25rem;
    color: #5A6A7A;
    font-size: 0.95rem;
  }
  
  .email-input-group {
    margin-bottom: 1rem;
  }
  
  .email-input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #2C3E50;
    font-size: 0.9rem;
  }
  
  .email-input-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .email-input-group input:focus {
    outline: none;
    border-color: #6B8E6B;
    box-shadow: 0 0 0 3px rgba(107, 142, 107, 0.1);
  }
  
  .email-input-group input:disabled {
    background: #F3F4F6;
    cursor: not-allowed;
  }
  
  .email-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #FEE2E2;
    border: 1px solid #FECACA;
    border-radius: 6px;
    color: #DC2626;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  
  .email-success {
    padding: 2rem;
    text-align: center;
    color: #059669;
  }
  
  .email-success h4 {
    margin: 1rem 0 0.5rem;
    color: #2C3E50;
  }
  
  .email-success p {
    margin: 0;
    color: #5A6A7A;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
  
  .cancel-btn {
    padding: 0.6rem 1.25rem;
    background: #F3F4F6;
    color: #4B5563;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .cancel-btn:hover:not(:disabled) {
    background: #E5E7EB;
  }
  
  .cancel-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .send-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
  }
  
  .send-btn:hover:not(:disabled) {
    background: #047857;
  }
  
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Email delivery section styles */
  .email-delivery-section {
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 12px;
    padding: 1.25rem;
    margin-top: 1.5rem;
  }
  
  .email-delivery-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #166534;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  
  .email-delivery-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .email-delivery-input:focus {
    outline: none;
    border-color: #27AE60;
    box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
  }
  
  .email-delivery-input:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
  
  .email-delivery-input.email-sent {
    background: #dcfce7;
    border-color: #22c55e;
    color: #166534;
  }
  
  .email-input-wrapper {
    position: relative;
  }
  
  .email-input-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .email-input-row .email-delivery-input {
    flex: 1;
    margin-bottom: 0;
  }
  
  .email-submit-btn {
    padding: 0.75rem 1.5rem;
    background: #27AE60;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
    transition: background 0.2s;
  }
  
  .email-submit-btn:hover:not(:disabled) {
    background: #219a52;
  }
  
  .email-submit-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  /* Pre-Assessment Disclaimer (always visible) */
  .pre-assessment-disclaimer {
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border: 1px solid #86efac;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .pre-assessment-disclaimer .disclaimer-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    color: #166534;
  }
  
  .pre-assessment-disclaimer .disclaimer-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #166534;
  }
  
  .pre-assessment-disclaimer .disclaimer-content p {
    color: #14532d;
    margin: 0 0 0.75rem 0;
    font-size: 0.9rem;
    line-height: 1.6;
  }
  
  .pre-assessment-disclaimer .disclaimer-content p:last-child {
    margin-bottom: 0;
  }
  
  .pre-assessment-disclaimer .disclaimer-content strong {
    color: #166534;
  }
  
  .pre-assessment-disclaimer .liability-text {
    font-size: 0.8rem;
    color: #15803d;
    font-style: italic;
    padding-top: 0.75rem;
    margin-top: 0.5rem;
    border-top: 1px solid #86efac;
  }
  
  /* Assessment Disclaimer (in results) */
  .assessment-disclaimer {
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 2rem;
  }
  
  .assessment-disclaimer h4 {
    color: #92400e;
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }
  
  .assessment-disclaimer p {
    color: #78350f;
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
    line-height: 1.6;
  }
  
  .assessment-disclaimer p:last-child {
    margin-bottom: 0;
  }
  
  .assessment-disclaimer .liability-text {
    font-size: 0.85rem;
    color: #a16207;
    font-style: italic;
    padding-top: 0.75rem;
    border-top: 1px solid #fcd34d;
  }
  
  .email-sent-text {
    display: block;
    font-size: 0.8rem;
    color: #166534;
    margin-top: -0.75rem;
    margin-bottom: 1rem;
  }

  .email-confirmed-text {
    display: block;
    font-size: 0.85rem;
    color: #27AE60;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
    padding-left: 0.25rem;
  }
  
  .email-sent-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: #22c55e;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    margin-left: auto;
  }
  
  .assessment-info-box {
    display: flex;
    gap: 0.75rem;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    border-radius: 8px;
    padding: 1rem;
    color: #92400e;
  }
  
  .assessment-info-box :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .assessment-info-text p {
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }
  
  .assessment-info-text ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .assessment-info-text li {
    margin-bottom: 0.25rem;
  }
  
  .assessment-info-text li:last-child {
    margin-bottom: 0;
  }
  
  /* Muuvment IQ Promotional Section */
  .muuvment-iq-promo {
    margin-top: 3rem;
  }
  
  .promo-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #d1d5db, transparent);
    margin-bottom: 2rem;
  }
  
  .promo-content {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }
  
  .promo-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: white;
    margin: 0 0 1.25rem 0;
  }
  
  .promo-description {
    font-size: 1.1rem;
    color: #cbd5e1;
    line-height: 1.7;
    max-width: 700px;
    margin: 0 auto 2rem auto;
  }
  
  .promo-description strong {
    color: white;
  }
  
  .promo-button {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    background: white;
    color: #1e293b;
    font-size: 1.1rem;
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }
  
  .promo-button:hover {
    background: #f1f5f9;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  }
  
  .promo-button :global(svg) {
    opacity: 0.7;
  }
</style>
