<script lang="ts">
  import { ChevronDown, ChevronUp, CheckCircle, FileText, Scale, Megaphone, Target, Clock } from 'lucide-svelte';
  
  let expandedPrinciple = $state<string | null>(null);
  
  function togglePrinciple(id: string) {
    expandedPrinciple = expandedPrinciple === id ? null : id;
  }
  
  // The 6 Competition Bureau Principles for Environmental Claims
  const principles = [
    {
      id: 'truthful',
      name: '1. Be Truthful',
      icon: CheckCircle,
      color: '#27AE60',
      summary: 'Claims must be accurate and not create false impressions',
      description: 'Environmental claims must be truthful and not misleading. This includes ensuring that the general impression created by the claim, as well as its literal meaning, is accurate. Claims should not exaggerate environmental benefits or omit material information.',
      billC59Reference: 'Section 74.01(1)(a) and (b) of the Competition Act prohibit representations that are "false or misleading in a material respect".',
      subcategories: [
        {
          name: 'Literal Accuracy',
          description: 'The specific words and data in the claim must be factually correct and verifiable.'
        },
        {
          name: 'General Impression',
          description: 'The overall impression created by the claim (including imagery and context) must accurately reflect reality.'
        },
        {
          name: 'No Exaggeration',
          description: 'Claims should not overstate environmental benefits or make benefits seem more significant than they are.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    },
    {
      id: 'substantiated',
      name: '2. Be Substantiated',
      icon: FileText,
      color: '#3498DB',
      summary: 'Claims must be backed by adequate and proper testing',
      description: 'All environmental claims must be supported by adequate and proper tests conducted in accordance with internationally recognised methodology. Businesses must have substantiation before making claims, not after.',
      billC59Reference: 'Section 74.01(1)(b.1) requires that environmental benefit claims be "based on an adequate and proper test" conducted in accordance with "internationally recognized methodology".',
      subcategories: [
        {
          name: 'Adequate Testing',
          description: 'Tests must be sufficient in scope and rigour to support the specific claims being made.'
        },
        {
          name: 'Recognised Methodology',
          description: 'Testing must follow internationally recognised standards (e.g., ISO 14021, ISO 14040 series).'
        },
        {
          name: 'Third-Party Verification',
          description: 'Independent verification strengthens claim credibility and demonstrates good faith compliance.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    },
    {
      id: 'specific',
      name: '3. Be Specific About Comparisons',
      icon: Scale,
      color: '#9B59B6',
      summary: 'Comparative claims must be fair, clear, and substantiated',
      description: 'When making comparative environmental claims (e.g., "greener than," "more sustainable"), businesses must clearly identify what is being compared, ensure the comparison is fair and meaningful, and substantiate the extent of any difference.',
      billC59Reference: 'Section 74.01(1)(b) addresses misleading representations, which includes unfair or unsubstantiated comparative claims.',
      subcategories: [
        {
          name: 'Clear Comparison Basis',
          description: 'The basis for comparison must be clearly stated (e.g., compared to what product, what time period, what metric).'
        },
        {
          name: 'Extent of Difference',
          description: 'The magnitude of any claimed improvement or difference must be substantiated.'
        },
        {
          name: 'Fair Comparisons',
          description: 'Comparisons must be fair and not cherry-pick favourable metrics while ignoring unfavourable ones.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    },
    {
      id: 'proportionate',
      name: '4. Be Proportionate',
      icon: Target,
      color: '#E67E22',
      summary: 'Claims should not exaggerate or cherry-pick benefits',
      description: 'Environmental claims should be proportionate to the actual environmental benefit. Minor improvements should not be presented as major achievements, and claims should not focus on small positive aspects while ignoring larger negative impacts.',
      billC59Reference: 'Relates to the "material respect" standard in Section 74.01(1)(b) - claims that create a materially misleading impression violate the Act.',
      subcategories: [
        {
          name: 'Proportionate Claims',
          description: 'The prominence of environmental claims should match the significance of the actual benefit.'
        },
        {
          name: 'Materiality',
          description: 'Claims should focus on environmental aspects that are material to the product\'s overall impact.'
        },
        {
          name: 'No Cherry-Picking',
          description: 'Businesses should not highlight minor benefits while concealing more significant environmental impacts.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    },
    {
      id: 'clarity',
      name: '5. When in Doubt, Spell it Out',
      icon: Megaphone,
      color: '#1ABC9C',
      summary: 'Avoid vague terms and be clear about scope and limitations',
      description: 'Vague or ambiguous terms like "eco-friendly," "green," or "sustainable" should be avoided unless clearly qualified. The scope of claims must be clear, and any limitations or conditions should be prominently disclosed.',
      billC59Reference: 'Section 74.01(1)(b.2) specifically addresses claims about environmental benefits that are vague or not properly qualified.',
      subcategories: [
        {
          name: 'Avoid Vague Terms',
          description: 'General terms like "green," "eco-friendly," or "sustainable" require clear qualification and substantiation.'
        },
        {
          name: 'Scope Clarity',
          description: 'Claims must clearly indicate what aspect of the product or business they apply to (e.g., packaging only, manufacturing only).'
        },
        {
          name: 'Accessible Information',
          description: 'Supporting information and qualifications must be easily accessible to consumers, not buried in fine print.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    },
    {
      id: 'future',
      name: '6. Substantiate Future Claims',
      icon: Clock,
      color: '#E74C3C',
      summary: 'Forward-looking claims need concrete, documented plans',
      description: 'Claims about future environmental performance (e.g., "net zero by 2050") must be based on concrete plans with meaningful steps already underway. Aspirational goals without substantive action plans may be considered misleading.',
      billC59Reference: 'Section 74.01(1)(b.2) requires that claims about a business\'s environmental benefits be "based on adequate and proper substantiation".',
      subcategories: [
        {
          name: 'Concrete Plan',
          description: 'Future claims must be supported by a documented, detailed plan for achieving the stated goal.'
        },
        {
          name: 'Interim Targets',
          description: 'Long-term commitments should include measurable interim milestones and progress indicators.'
        },
        {
          name: 'Meaningful Steps Underway',
          description: 'There must be evidence of current actions being taken toward the future goal, not just intentions.'
        }
      ],
      source: 'Competition Bureau Canada, "Environmental claims and the Competition Act" (June 2025)'
    }
  ];
</script>

<svelte:head>
  <title>Methodology | Greenwash Check - Competition Bureau's 6 Principles</title>
  <meta name="description" content="Our assessment methodology is based on the Competition Bureau of Canada's 6 official principles for environmental claims under Bill C-59." />
</svelte:head>

<div class="methodology-page">
  <div class="container">
    <div class="page-header">
      <h1>Assessment Methodology</h1>
      <p class="subtitle">Based on the Competition Bureau of Canada's 6 Official Principles for Environmental Claims</p>
    </div>
    
    <div class="intro-section">
      <p>
        Our assessment methodology is directly aligned with the <strong>Competition Bureau of Canada's official guidelines</strong> 
        for environmental claims, published in June 2025 following the Bill C-59 amendments to the Competition Act. 
        These guidelines establish six key principles that businesses must follow to ensure their environmental 
        claims are compliant with Canadian law.
      </p>
      <div class="source-citation">
        <strong>Primary Source:</strong> Competition Bureau Canada, 
        <a href="https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/environmental-claims-and-competition-act" target="_blank" rel="noopener">
          "Environmental claims and the Competition Act"
        </a> (June 2025)
      </div>
    </div>
    
    <div class="principles-section">
      <h2>The 6 Principles</h2>
      <p class="section-intro">
        Each principle addresses a specific aspect of environmental claim compliance. Click on any principle to see its subcategories and assessment criteria.
      </p>
      
      <div class="principles-list">
        {#each principles as principle}
          <div class="principle-card" style="--principle-color: {principle.color}">
            <button 
              class="principle-header"
              onclick={() => togglePrinciple(principle.id)}
              aria-expanded={expandedPrinciple === principle.id}
            >
              <div class="principle-icon">
                <svelte:component this={principle.icon} size={28} />
              </div>
              <div class="principle-info">
                <h3>{principle.name}</h3>
                <p class="principle-summary">{principle.summary}</p>
              </div>
              <div class="expand-icon">
                {#if expandedPrinciple === principle.id}
                  <ChevronUp size={24} />
                {:else}
                  <ChevronDown size={24} />
                {/if}
              </div>
            </button>
            
            {#if expandedPrinciple === principle.id}
              <div class="principle-details">
                <div class="principle-description">
                  <p>{principle.description}</p>
                </div>
                
                <div class="bill-reference">
                  <strong>Bill C-59 Reference:</strong>
                  <p>{principle.billC59Reference}</p>
                </div>
                
                <div class="subcategories">
                  <h4>Assessment Subcategories</h4>
                  <div class="subcategory-list">
                    {#each principle.subcategories as sub}
                      <div class="subcategory">
                        <h5>{sub.name}</h5>
                        <p>{sub.description}</p>
                      </div>
                    {/each}
                  </div>
                </div>
                
                <div class="principle-source">
                  <em>Source: {principle.source}</em>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    <div class="scoring-section">
      <h2>How We Score</h2>
      
      <div class="scoring-overview">
        <p>
          Each document undergoes a comprehensive assessment against all <strong>6 Competition Bureau principles</strong> 
          and their <strong>18 subcategories</strong>. Our AI-powered analysis examines every environmental claim 
          in your document to provide detailed, actionable insights.
        </p>
      </div>
      
      <div class="scoring-process">
        <h3>Assessment Process</h3>
        <div class="process-steps">
          <div class="process-step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h4>Document Analysis</h4>
              <p>Our AI reads your entire document, identifying all environmental claims, sustainability statements, and eco-related representations including text, images, charts, and infographics.</p>
            </div>
          </div>
          <div class="process-step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h4>Claim Extraction</h4>
              <p>Each environmental claim is extracted and categorised by type (carbon, waste, water, biodiversity, etc.) and mapped to the relevant Competition Bureau principles.</p>
            </div>
          </div>
          <div class="process-step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h4>Principle-by-Principle Evaluation</h4>
              <p>Every claim is evaluated against all 6 principles and their subcategories to identify compliance gaps, missing substantiation, and potential greenwashing risks.</p>
            </div>
          </div>
          <div class="process-step">
            <div class="step-number">4</div>
            <div class="step-content">
              <h4>Score Calculation</h4>
              <p>Scores are calculated at the subcategory, principle, and overall document level, with detailed evidence and recommendations for each finding.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="scoring-criteria">
        <h3>What We Evaluate for Each Claim</h3>
        <div class="criteria-grid">
          <div class="criteria-card">
            <div class="criteria-icon compliance">📊</div>
            <h4>Compliance Level</h4>
            <p>How well the claim adheres to each principle, scored from 0-100 based on specific compliance indicators.</p>
            <div class="score-scale">
              <span class="scale-item high">80-100: Compliant</span>
              <span class="scale-item medium">50-79: Needs Improvement</span>
              <span class="scale-item low">0-49: High Risk</span>
            </div>
          </div>
          <div class="criteria-card">
            <div class="criteria-icon evidence">📝</div>
            <h4>Evidence</h4>
            <p>Specific quotes extracted directly from your document with page references, allowing you to locate and address each issue.</p>
          </div>
          <div class="criteria-card">
            <div class="criteria-icon rationale">💡</div>
            <h4>Rationale</h4>
            <p>Clear explanation of why the score was assigned, referencing the specific Competition Bureau principle and Bill C-59 requirements.</p>
          </div>
          <div class="criteria-card">
            <div class="criteria-icon recommendations">✅</div>
            <h4>Recommendations</h4>
            <p>Actionable suggestions for improving compliance, including specific language changes, substantiation requirements, and disclosure additions.</p>
          </div>
        </div>
      </div>
      
      <div class="scoring-calculation">
        <h3>Score Calculation</h3>
        <div class="calculation-details">
          <div class="calculation-item">
            <h4>Subcategory Scores</h4>
            <p>Each of the 18 subcategories receives a score (0-100) based on how well the document's claims comply with that specific requirement.</p>
          </div>
          <div class="calculation-item">
            <h4>Principle Scores</h4>
            <p>The 3 subcategory scores within each principle are averaged to produce the principle score. Each principle is weighted equally at approximately 16.7%.</p>
          </div>
          <div class="calculation-item">
            <h4>Overall Score</h4>
            <p>The final score is the weighted average across all 6 principles, providing a single compliance indicator for your document.</p>
          </div>
        </div>
        
        <div class="risk-levels">
          <h4>Risk Level Classification</h4>
          <div class="risk-grid">
            <div class="risk-item low-risk">
              <span class="risk-score">80-100</span>
              <span class="risk-label">Low Risk</span>
              <p>Claims are well-substantiated and compliant with Competition Bureau guidelines.</p>
            </div>
            <div class="risk-item medium-risk">
              <span class="risk-score">50-79</span>
              <span class="risk-label">Medium Risk</span>
              <p>Some claims may need additional substantiation or clarification to ensure compliance.</p>
            </div>
            <div class="risk-item high-risk">
              <span class="risk-score">0-49</span>
              <span class="risk-label">High Risk</span>
              <p>Significant compliance gaps identified. Immediate attention recommended before publication.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="scoring-limitations">
        <h3>Important Considerations</h3>
        <ul>
          <li><strong>AI-Assisted Analysis:</strong> Our assessment uses advanced AI to analyse documents, but AI can make mistakes. Always review findings with your legal and compliance teams.</li>
          <li><strong>Point-in-Time Assessment:</strong> Scores reflect compliance at the time of analysis. Regulations and guidance may evolve.</li>
          <li><strong>Document Scope:</strong> The assessment evaluates only the content provided. External substantiation documents are not automatically verified.</li>
          <li><strong>Not Legal Advice:</strong> This tool provides compliance guidance but does not constitute legal advice. Consult qualified legal counsel for specific compliance questions.</li>
        </ul>
      </div>
    </div>
    
    <div class="additional-sources">
      <h2>Additional Sources</h2>
      <p>Our methodology also incorporates guidance from:</p>
      <ul>
        <li>
          <a href="https://laws-lois.justice.gc.ca/eng/acts/c-34/page-6.html" target="_blank" rel="noopener">
            Competition Act (R.S.C., 1985, c. C-34)
          </a> - The primary legislation as amended by Bill C-59
        </li>
        <li>
          <a href="https://www.iso.org/standard/66652.html" target="_blank" rel="noopener">
            ISO 14021:2016
          </a> - Environmental labels and declarations — Self-declared environmental claims
        </li>
        <li>
          <a href="https://www.iso.org/standard/38498.html" target="_blank" rel="noopener">
            ISO 14040:2006
          </a> - Environmental management — Life cycle assessment
        </li>
        <li>
          Nemes et al. (2022) - "An Integrated Framework to Assess Greenwashing" - Peer-reviewed academic framework
        </li>
      </ul>
    </div>
  </div>
</div>

<style>
  .methodology-page {
    min-height: calc(100vh - 200px);
    padding: 2rem 1rem;
    background: #F8FAF8;
  }
  
  .container {
    max-width: 900px;
    margin: 0 auto;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    font-size: 2.25rem;
    color: #0F172A;
    margin-bottom: 0.5rem;
  }
  
  .subtitle {
    font-size: 1.1rem;
    color: #64748B;
  }
  
  .intro-section {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .intro-section p {
    color: #334155;
    line-height: 1.7;
    margin-bottom: 1rem;
  }
  
  .source-citation {
    background: #F0FDF4;
    border-left: 4px solid #4A428E;
    padding: 0.75rem 1rem;
    border-radius: 0 8px 8px 0;
    font-size: 0.9rem;
  }
  
  .source-citation a {
    color: #4A428E;
    text-decoration: underline;
  }
  
  .principles-section h2,
  .scoring-section h2,
  .additional-sources h2 {
    font-size: 1.5rem;
    color: #0F172A;
    margin-bottom: 1rem;
  }
  
  .section-intro {
    color: #64748B;
    margin-bottom: 1.5rem;
  }
  
  .principles-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .principle-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-left: 4px solid var(--principle-color);
  }
  
  .principle-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  
  .principle-header:hover {
    background: #F8FAFC;
  }
  
  .principle-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--principle-color) 15%, white);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--principle-color);
    flex-shrink: 0;
  }
  
  .principle-info {
    flex: 1;
  }
  
  .principle-info h3 {
    font-size: 1.1rem;
    color: #0F172A;
    margin-bottom: 0.25rem;
  }
  
  .principle-summary {
    font-size: 0.9rem;
    color: #64748B;
    margin: 0;
  }
  
  .expand-icon {
    color: #94A3B8;
    flex-shrink: 0;
  }
  
  .principle-details {
    padding: 0 1.25rem 1.25rem;
    border-top: 1px solid #E2E8F0;
  }
  
  .principle-description {
    padding: 1rem 0;
  }
  
  .principle-description p {
    color: #334155;
    line-height: 1.7;
  }
  
  .bill-reference {
    background: #FEF3C7;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .bill-reference strong {
    color: #92400E;
    display: block;
    margin-bottom: 0.5rem;
  }
  
  .bill-reference p {
    color: #78350F;
    font-size: 0.9rem;
    margin: 0;
  }
  
  .subcategories h4 {
    font-size: 1rem;
    color: #0F172A;
    margin-bottom: 0.75rem;
  }
  
  .subcategory-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .subcategory {
    background: #F8FAFC;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .subcategory h5 {
    font-size: 0.95rem;
    color: var(--principle-color);
    margin-bottom: 0.25rem;
  }
  
  .subcategory p {
    font-size: 0.9rem;
    color: #64748B;
    margin: 0;
  }
  
  .principle-source {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #E2E8F0;
    font-size: 0.85rem;
    color: #94A3B8;
  }
  
  .scoring-section,
  .additional-sources {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .scoring-section p,
  .additional-sources p {
    color: #334155;
    line-height: 1.7;
  }
  
  .scoring-section ul,
  .additional-sources ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }
  
  .scoring-section li,
  .additional-sources li {
    color: #334155;
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }
  
  .additional-sources a {
    color: #4A428E;
    text-decoration: underline;
  }
  
  /* Scoring Section Detailed Styles */
  .scoring-section h3 {
    font-size: 1.25rem;
    color: #1C2947;
    margin: 2rem 0 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid #E2E8F0;
  }
  
  .scoring-section h3:first-of-type {
    border-top: none;
    padding-top: 0;
  }
  
  .scoring-overview {
    background: #F0FDF4;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  
  .scoring-overview p {
    margin: 0;
  }
  
  /* Process Steps */
  .process-steps {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .process-step {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .step-number {
    width: 36px;
    height: 36px;
    background: #4A428E;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    flex-shrink: 0;
  }
  
  .step-content {
    flex: 1;
  }
  
  .step-content h4 {
    font-size: 1rem;
    color: #1C2947;
    margin: 0 0 0.25rem;
  }
  
  .step-content p {
    margin: 0;
    font-size: 0.95rem;
    color: #64748B;
  }
  
  /* Criteria Grid */
  .criteria-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .criteria-card {
    background: #F8FAFC;
    border-radius: 8px;
    padding: 1.25rem;
    border: 1px solid #E2E8F0;
  }
  
  .criteria-icon {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  
  .criteria-card h4 {
    font-size: 1rem;
    color: #1C2947;
    margin: 0 0 0.5rem;
  }
  
  .criteria-card p {
    font-size: 0.9rem;
    color: #64748B;
    margin: 0;
  }
  
  .score-scale {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.75rem;
    font-size: 0.8rem;
  }
  
  .scale-item {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }
  
  .scale-item.high {
    background: #D1FAE5;
    color: #065F46;
  }
  
  .scale-item.medium {
    background: #FEF3C7;
    color: #92400E;
  }
  
  .scale-item.low {
    background: #FEE2E2;
    color: #991B1B;
  }
  
  /* Calculation Details */
  .calculation-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .calculation-item {
    background: #F8FAFC;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #E2E8F0;
  }
  
  .calculation-item h4 {
    font-size: 0.95rem;
    color: #4A428E;
    margin: 0 0 0.5rem;
  }
  
  .calculation-item p {
    font-size: 0.9rem;
    margin: 0;
  }
  
  /* Risk Levels */
  .risk-levels h4 {
    font-size: 1rem;
    color: #1C2947;
    margin: 0 0 1rem;
  }
  
  .risk-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  
  .risk-item {
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }
  
  .risk-item.low-risk {
    background: #D1FAE5;
    border: 1px solid #A7F3D0;
  }
  
  .risk-item.medium-risk {
    background: #FEF3C7;
    border: 1px solid #FDE68A;
  }
  
  .risk-item.high-risk {
    background: #FEE2E2;
    border: 1px solid #FECACA;
  }
  
  .risk-score {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }
  
  .risk-item.low-risk .risk-score { color: #065F46; }
  .risk-item.medium-risk .risk-score { color: #92400E; }
  .risk-item.high-risk .risk-score { color: #991B1B; }
  
  .risk-label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .risk-item.low-risk .risk-label { color: #065F46; }
  .risk-item.medium-risk .risk-label { color: #92400E; }
  .risk-item.high-risk .risk-label { color: #991B1B; }
  
  .risk-item p {
    font-size: 0.85rem;
    margin: 0;
    color: #334155;
  }
  
  /* Limitations */
  .scoring-limitations {
    background: #FEF3C7;
    border-radius: 8px;
    padding: 1.25rem;
    margin-top: 1.5rem;
  }
  
  .scoring-limitations h3 {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
    color: #92400E;
  }
  
  .scoring-limitations ul {
    margin: 0;
  }
  
  .scoring-limitations li {
    color: #78350F;
  }
  
  @media (max-width: 768px) {
    .criteria-grid,
    .calculation-details,
    .risk-grid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 640px) {
    .page-header h1 {
      font-size: 1.75rem;
    }
    
    .principle-header {
      padding: 1rem;
    }
    
    .principle-icon {
      width: 40px;
      height: 40px;
    }
    
    .principle-info h3 {
      font-size: 1rem;
    }
  }
</style>
