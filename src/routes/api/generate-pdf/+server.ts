import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface PrincipleScore {
  principle: string;
  description: string;
  score: number;
  status: string;
  subcategories?: {
    name: string;
    score: number;
    status: string;
    rationale: string;
    issues: string[];
    recommendations: string[];
  }[];
}

interface Issue {
  id: number;
  severity: string;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  principle: string;
  legalRisk: string;
}

interface AssessmentData {
  fileName?: string;
  timestamp: string;
  overallScore: number;
  riskLevel: string;
  executiveSummary?: string;
  summary?: string;
  principleScores?: PrincipleScore[];
  top20Issues?: Issue[];
  positiveFindings?: {
    title: string;
    description: string;
    principle: string;
  }[];
  claimsAnalyzed?: number;
  metadata?: {
    pageCount?: number;
    analysisMode?: string;
    processingTime?: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#27AE60';
  if (score >= 40) return '#F39C12';
  return '#E74C3C';
}

function getRiskColor(level: string): string {
  if (level?.toLowerCase().includes('low')) return '#27AE60';
  if (level?.toLowerCase().includes('medium')) return '#F39C12';
  if (level?.toLowerCase().includes('high')) return '#E74C3C';
  return '#7F8C8D';
}

function generateStructuredPdfHtml(data: AssessmentData): string {
  const date = new Date(data.timestamp).toLocaleDateString('en-CA', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const scoreColor = getScoreColor(data.overallScore);
  const riskColor = getRiskColor(data.riskLevel);

  // Generate principle scores section
  let principlesHtml = '';
  if (data.principleScores && data.principleScores.length > 0) {
    principlesHtml = `
      <div class="section">
        <h2>Competition Bureau 6 Principles Assessment</h2>
        <table class="principles-table">
          <thead>
            <tr>
              <th>Principle</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.principleScores.map(p => `
              <tr>
                <td>
                  <strong>${p.principle}</strong>
                  <br><small>${p.description}</small>
                </td>
                <td style="color: ${getScoreColor(p.score)}; font-weight: bold; text-align: center;">${p.score}/100</td>
                <td style="text-align: center;">${p.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${data.principleScores.map(p => {
          if (!p.subcategories || p.subcategories.length === 0) return '';
          return `
            <div class="principle-detail">
              <h3>${p.principle}</h3>
              <table class="subcategory-table">
                <thead>
                  <tr>
                    <th>Subcategory</th>
                    <th>Score</th>
                    <th>Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  ${p.subcategories.map(sub => `
                    <tr>
                      <td><strong>${sub.name}</strong></td>
                      <td style="color: ${getScoreColor(sub.score)}; font-weight: bold; text-align: center;">${sub.score}</td>
                      <td>${sub.rationale}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Generate issues section
  let issuesHtml = '';
  if (data.top20Issues && data.top20Issues.length > 0) {
    issuesHtml = `
      <div class="section page-break">
        <h2>Key Issues Identified (${data.top20Issues.length})</h2>
        ${data.top20Issues.map((issue, i) => `
          <div class="issue-card ${issue.severity?.toLowerCase()}">
            <div class="issue-header">
              <span class="issue-number">#${i + 1}</span>
              <span class="issue-title">${issue.title}</span>
              <span class="severity-badge ${issue.severity?.toLowerCase()}">${issue.severity}</span>
            </div>
            <p class="issue-description">${issue.description}</p>
            ${issue.evidence ? `<div class="issue-field"><strong>Evidence:</strong> ${issue.evidence}</div>` : ''}
            ${issue.recommendation ? `<div class="issue-field"><strong>Recommendation:</strong> ${issue.recommendation}</div>` : ''}
            ${issue.principle ? `<div class="issue-field"><strong>Related Principle:</strong> ${issue.principle}</div>` : ''}
            ${issue.legalRisk ? `<div class="issue-field"><strong>Legal Risk:</strong> ${issue.legalRisk}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Generate positive findings section
  let positivesHtml = '';
  if (data.positiveFindings && data.positiveFindings.length > 0) {
    positivesHtml = `
      <div class="section">
        <h2>Positive Findings (${data.positiveFindings.length})</h2>
        ${data.positiveFindings.map(p => `
          <div class="positive-card">
            <h4>${p.title}</h4>
            <p>${p.description}</p>
            <span class="positive-principle">${p.principle}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Greenwash Check Report - ${data.fileName || 'Assessment'}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 0;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        /* Cover Page */
        .cover-page {
          text-align: center;
          padding: 60px 40px;
          background: linear-gradient(135deg, #1a365d 0%, #2d4a3e 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .cover-logo {
          font-size: 32pt;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .cover-subtitle {
          font-size: 14pt;
          color: #a0d8b3;
          margin-bottom: 60px;
        }
        
        .cover-title {
          font-size: 24pt;
          margin-bottom: 20px;
        }
        
        .cover-document {
          font-size: 16pt;
          color: #a0d8b3;
          margin-bottom: 40px;
        }
        
        .cover-score {
          font-size: 72pt;
          font-weight: 700;
          margin: 20px 0;
        }
        
        .cover-risk {
          display: inline-block;
          padding: 10px 30px;
          border-radius: 30px;
          font-size: 16pt;
          font-weight: 600;
          margin-bottom: 60px;
        }
        
        .cover-date {
          font-size: 12pt;
          color: #a0d8b3;
        }
        
        /* Content Sections */
        .section {
          margin-bottom: 30px;
        }
        
        h2 {
          color: #1a365d;
          font-size: 16pt;
          border-bottom: 2px solid #27AE60;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }
        
        h3 {
          color: #2d4a3e;
          font-size: 13pt;
          margin-top: 25px;
          margin-bottom: 10px;
        }
        
        /* Executive Summary */
        .executive-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #27AE60;
          margin-bottom: 30px;
        }
        
        .executive-summary p {
          margin: 0;
        }
        
        /* Score Overview */
        .score-overview {
          display: flex;
          justify-content: space-between;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .score-box {
          text-align: center;
        }
        
        .score-value {
          font-size: 36pt;
          font-weight: 700;
        }
        
        .score-label {
          font-size: 10pt;
          color: #7F8C8D;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #E0E0E0;
        }
        
        th {
          background: #1a365d;
          color: white;
          font-weight: 600;
        }
        
        tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .principles-table td:first-child {
          width: 60%;
        }
        
        .subcategory-table {
          font-size: 10pt;
        }
        
        .principle-detail {
          margin-top: 20px;
          padding: 15px;
          background: #fafafa;
          border-radius: 8px;
        }
        
        /* Issue Cards */
        .issue-card {
          border: 1px solid #E0E0E0;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
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
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .issue-number {
          background: #E0E0E0;
          color: #5A6A7A;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 600;
        }
        
        .issue-title {
          flex: 1;
          font-weight: 600;
          color: #2C3E50;
        }
        
        .severity-badge {
          padding: 3px 10px;
          border-radius: 4px;
          font-size: 9pt;
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
        
        .issue-description {
          color: #5A6A7A;
          margin: 0 0 10px 0;
          font-size: 10pt;
        }
        
        .issue-field {
          font-size: 9pt;
          color: #5A6A7A;
          margin-top: 8px;
          padding: 8px;
          background: rgba(255,255,255,0.5);
          border-radius: 4px;
        }
        
        /* Positive Cards */
        .positive-card {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        
        .positive-card h4 {
          margin: 0 0 8px 0;
          color: #166534;
        }
        
        .positive-card p {
          margin: 0 0 8px 0;
          color: #5A6A7A;
          font-size: 10pt;
        }
        
        .positive-principle {
          font-size: 9pt;
          color: #27AE60;
          font-weight: 500;
        }
        
        /* Footer */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E0E0E0;
          font-size: 9pt;
          color: #7F8C8D;
        }
        
        .disclaimer {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 15px;
          margin-top: 30px;
          font-size: 9pt;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="cover-page">
        <div class="cover-logo">Greenwash Check</div>
        <div class="cover-subtitle">Bill C-59 Compliance Assessment</div>
        
        <div class="cover-title">Assessment Report</div>
        <div class="cover-document">${data.fileName || 'Document Assessment'}</div>
        
        <div class="cover-score" style="color: ${scoreColor}">${data.overallScore}/100</div>
        <div class="cover-risk" style="background: ${riskColor}">${data.riskLevel} Risk</div>
        
        <div class="cover-date">Generated: ${date}</div>
      </div>
      
      <!-- Executive Summary -->
      <div class="section page-break">
        <h2>Executive Summary</h2>
        <div class="executive-summary">
          <p>${data.executiveSummary || data.summary || 'No summary available.'}</p>
        </div>
        
        <div class="score-overview">
          <div class="score-box">
            <div class="score-value" style="color: ${scoreColor}">${data.overallScore}</div>
            <div class="score-label">Overall Score</div>
          </div>
          <div class="score-box">
            <div class="score-value">${data.claimsAnalyzed || 'N/A'}</div>
            <div class="score-label">Claims Analyzed</div>
          </div>
          <div class="score-box">
            <div class="score-value">${data.top20Issues?.length || 0}</div>
            <div class="score-label">Issues Found</div>
          </div>
          <div class="score-box">
            <div class="score-value">${data.positiveFindings?.length || 0}</div>
            <div class="score-label">Positive Findings</div>
          </div>
        </div>
        
        ${data.metadata ? `
          <p><strong>Analysis Details:</strong> ${data.metadata.pageCount ? `${data.metadata.pageCount} pages analyzed` : ''} 
          ${data.metadata.analysisMode ? `using ${data.metadata.analysisMode} mode` : ''}</p>
        ` : ''}
      </div>
      
      ${principlesHtml}
      
      ${issuesHtml}
      
      ${positivesHtml}
      
      <!-- Disclaimer -->
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This report is generated by an AI-powered assessment tool and provides informational analysis only. 
        It does not constitute legal or compliance advice. Muuvment Ltd. shall not be held liable for any damages arising from reliance on this assessment.
        This service is governed by the laws of the Province of Ontario, Canada.
      </div>
      
      <div class="footer">
        <p>Generated by Greenwash Check | www.greenwashcheck.com | A free tool by Muuvment Ltd.</p>
      </div>
    </body>
    </html>
  `;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: AssessmentData = await request.json();

    if (!data.overallScore && data.overallScore !== 0) {
      return json({ error: 'Missing assessment data' }, { status: 400 });
    }

    const html = generateStructuredPdfHtml(data);
    const fileName = `GreenwashCheck-Report-${data.fileName?.replace(/\.[^/.]+$/, '') || 'Assessment'}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Use dynamic import for child_process and fs
    const { spawn } = await import('child_process');
    const { writeFileSync, readFileSync, unlinkSync, mkdtempSync } = await import('fs');
    const { join } = await import('path');
    const { tmpdir } = await import('os');

    // Create temp directory and files
    const tempDir = mkdtempSync(join(tmpdir(), 'pdf-'));
    const htmlPath = join(tempDir, 'input.html');
    const pdfPath = join(tempDir, 'output.pdf');

    // Write HTML to temp file
    writeFileSync(htmlPath, html, 'utf-8');

    // Convert HTML to PDF using weasyprint
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const weasyprint = spawn('weasyprint', [htmlPath, pdfPath]);
      
      let stderr = '';
      weasyprint.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      weasyprint.on('close', (code) => {
        if (code === 0) {
          try {
            const pdf = readFileSync(pdfPath);
            // Clean up temp files
            try {
              unlinkSync(htmlPath);
              unlinkSync(pdfPath);
            } catch (e) {
              // Ignore cleanup errors
            }
            resolve(pdf);
          } catch (e) {
            reject(new Error('Failed to read generated PDF'));
          }
        } else {
          reject(new Error(`WeasyPrint failed with code ${code}: ${stderr}`));
        }
      });

      weasyprint.on('error', (err) => {
        reject(new Error(`Failed to spawn weasyprint: ${err.message}`));
      });
    });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return json({ error: 'Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
};
