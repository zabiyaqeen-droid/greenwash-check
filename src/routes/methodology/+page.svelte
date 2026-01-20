<script lang="ts">
  import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Scale, FileText, Award, BarChart3, Target, Layers } from 'lucide-svelte';
  
  let expandedDimension = $state<string | null>(null);
  let expandedCriterion = $state<string | null>(null);
  
  function toggleDimension(id: string) {
    expandedDimension = expandedDimension === id ? null : id;
  }
  
  function toggleCriterion(id: string) {
    expandedCriterion = expandedCriterion === id ? null : id;
  }
  
  const dimensions = [
    {
      id: 'truthfulness',
      name: 'Truthfulness & Accuracy',
      icon: CheckCircle,
      color: '#27AE60',
      weight: 30,
      description: 'Evaluates whether environmental claims are factually correct, supported by evidence, and do not create misleading impressions through omission or exaggeration.',
      billC59Alignment: 'Directly addresses Section 74.01(1)(b) of the Competition Act as amended by Bill C-59, which prohibits representations that are "false or misleading in a material respect" regarding environmental benefits.',
      criteria: [
        {
          id: 'factual-accuracy',
          name: 'Factual Accuracy',
          weight: 35,
          description: 'Assesses whether specific claims made about environmental performance, certifications, or achievements are verifiable and accurate.',
          indicators: [
            'Claims match verifiable third-party data',
            'Statistics and percentages are accurate and current',
            'Certifications mentioned are valid and applicable',
            'Historical comparisons use consistent methodology'
          ],
          redFlags: [
            'Unverifiable statistics or percentages',
            'Expired or inapplicable certifications',
            'Cherry-picked data points',
            'Misleading historical comparisons'
          ]
        },
        {
          id: 'general-impression',
          name: 'General Impression',
          weight: 35,
          description: 'Evaluates whether the overall impression created by the communication accurately reflects the actual environmental performance.',
          indicators: [
            'Overall tone matches actual environmental impact',
            'Visual elements support rather than exaggerate claims',
            'Context provided prevents misinterpretation',
            'Limitations clearly acknowledged'
          ],
          redFlags: [
            'Imagery suggesting greater environmental benefit than reality',
            'Vague language creating inflated impressions',
            'Selective highlighting of minor achievements',
            'Burying negative information'
          ]
        },
        {
          id: 'material-omissions',
          name: 'Material Omissions',
          weight: 30,
          description: 'Identifies whether important information that would affect consumer understanding has been omitted.',
          indicators: [
            'Trade-offs and limitations disclosed',
            'Full lifecycle impacts considered',
            'Negative environmental aspects acknowledged',
            'Scope of claims clearly defined'
          ],
          redFlags: [
            'Hidden environmental costs',
            'Undisclosed trade-offs',
            'Selective scope to hide negative impacts',
            'Missing context for comparative claims'
          ]
        }
      ]
    },
    {
      id: 'substantiation',
      name: 'Substantiation & Evidence',
      icon: FileText,
      color: '#3498DB',
      weight: 25,
      description: 'Assesses whether environmental claims are backed by adequate and appropriate evidence that meets the new substantiation requirements.',
      billC59Alignment: 'Implements the new Section 74.01(1)(b.1) requirement that environmental benefit claims must be based on "adequate and proper test" conducted in accordance with "internationally recognized methodology".',
      criteria: [
        {
          id: 'evidence-support',
          name: 'Evidence Support',
          weight: 40,
          description: 'Evaluates the quality and relevance of evidence provided to support environmental claims.',
          indicators: [
            'Claims linked to specific data sources',
            'Evidence is recent and relevant',
            'Sample sizes and methodologies appropriate',
            'Data from credible sources'
          ],
          redFlags: [
            'Claims without supporting evidence',
            'Outdated or irrelevant data',
            'Inappropriate extrapolation',
            'Self-reported data without verification'
          ]
        },
        {
          id: 'third-party-verification',
          name: 'Third-Party Verification',
          weight: 35,
          description: 'Assesses whether claims have been independently verified by qualified third parties.',
          indicators: [
            'Independent audits or certifications',
            'Recognised certification bodies',
            'Transparent verification processes',
            'Regular re-verification'
          ],
          redFlags: [
            'Self-certification only',
            'Unknown or unaccredited verifiers',
            'Outdated certifications',
            'Partial or selective verification'
          ]
        },
        {
          id: 'methodology-transparency',
          name: 'Methodology Transparency',
          weight: 25,
          description: 'Evaluates whether the methodology used to generate environmental claims is clearly explained and follows recognised standards.',
          indicators: [
            'Clear explanation of measurement methods',
            'Use of internationally recognised standards',
            'Assumptions and limitations disclosed',
            'Methodology available for review'
          ],
          redFlags: [
            'Proprietary or undisclosed methodologies',
            'Non-standard measurement approaches',
            'Hidden assumptions',
            'Methodology not available'
          ]
        }
      ]
    },
    {
      id: 'clarity',
      name: 'Clarity & Specificity',
      icon: Target,
      color: '#9B59B6',
      weight: 25,
      description: 'Evaluates whether environmental claims are clear, specific, and unambiguous, avoiding vague or overly broad language.',
      billC59Alignment: 'Supports compliance with the general prohibition against misleading representations by ensuring claims are sufficiently specific to be properly understood and evaluated.',
      criteria: [
        {
          id: 'clear-language',
          name: 'Clear Language',
          weight: 40,
          description: 'Assesses whether environmental terminology is used correctly and explained where necessary.',
          indicators: [
            'Technical terms defined or explained',
            'Consistent use of terminology',
            'Appropriate for target audience',
            'Avoids jargon without explanation'
          ],
          redFlags: [
            'Undefined buzzwords (e.g., "eco-friendly", "green", "natural")',
            'Inconsistent terminology',
            'Overly technical without explanation',
            'Ambiguous language'
          ]
        },
        {
          id: 'scope-definition',
          name: 'Scope Definition',
          weight: 35,
          description: 'Evaluates whether the scope and boundaries of environmental claims are clearly defined.',
          indicators: [
            'Clear product/service boundaries',
            'Geographic scope specified',
            'Time periods defined',
            'Applicable conditions stated'
          ],
          redFlags: [
            'Unclear what claim applies to',
            'Ambiguous geographic coverage',
            'Undefined time frames',
            'Missing conditions or limitations'
          ]
        },
        {
          id: 'quantifiable-metrics',
          name: 'Quantifiable Metrics',
          weight: 25,
          description: 'Assesses whether claims include specific, measurable metrics rather than vague qualitative statements.',
          indicators: [
            'Specific numbers and percentages',
            'Clear units of measurement',
            'Defined baselines for comparisons',
            'Measurable targets and outcomes'
          ],
          redFlags: [
            'Vague qualitative claims',
            'Missing units or baselines',
            'Undefined improvement claims',
            'Non-measurable commitments'
          ]
        }
      ]
    },
    {
      id: 'context',
      name: 'Context & Comparability',
      icon: BarChart3,
      color: '#E67E22',
      weight: 20,
      description: 'Assesses whether environmental claims are presented in appropriate context and whether comparisons are fair and meaningful.',
      billC59Alignment: 'Ensures comparative claims meet the standard of not being "false or misleading" by requiring appropriate context and fair comparison bases.',
      criteria: [
        {
          id: 'fair-comparisons',
          name: 'Fair Comparisons',
          weight: 35,
          description: 'Evaluates whether comparative environmental claims use appropriate and fair comparison bases.',
          indicators: [
            'Like-for-like comparisons',
            'Comparison basis clearly stated',
            'Industry benchmarks used appropriately',
            'Competitor comparisons fair and accurate'
          ],
          redFlags: [
            'Unfair comparison bases',
            'Cherry-picked competitors',
            'Outdated comparison data',
            'Misleading industry averages'
          ]
        },
        {
          id: 'baseline-clarity',
          name: 'Baseline Clarity',
          weight: 35,
          description: 'Assesses whether baselines for improvement claims are clearly defined and appropriate.',
          indicators: [
            'Clear baseline year or period',
            'Baseline methodology explained',
            'Consistent baseline across claims',
            'Appropriate baseline selection'
          ],
          redFlags: [
            'Undefined baselines',
            'Shifting baselines',
            'Unusually favourable baseline selection',
            'Inconsistent baselines'
          ]
        },
        {
          id: 'lifecycle-consideration',
          name: 'Lifecycle Consideration',
          weight: 30,
          description: 'Evaluates whether claims consider the full lifecycle impact or clearly define the scope of assessment.',
          indicators: [
            'Full lifecycle assessment where claimed',
            'Clear scope boundaries when partial',
            'Upstream and downstream impacts considered',
            'End-of-life impacts addressed'
          ],
          redFlags: [
            'Ignoring significant lifecycle stages',
            'Claiming lifecycle benefits without full assessment',
            'Hidden upstream/downstream impacts',
            'Misleading end-of-life claims'
          ]
        }
      ]
    }
  ];
  
  const scoringLevels = [
    { range: '81-100', level: 'Low Risk', color: '#27AE60', description: 'Claims are well-substantiated, clear, and unlikely to be considered misleading under Bill C-59.' },
    { range: '61-80', level: 'Moderate Risk', color: '#F39C12', description: 'Claims have some gaps in substantiation or clarity that should be addressed to reduce regulatory risk.' },
    { range: '41-60', level: 'Elevated Risk', color: '#E67E22', description: 'Significant concerns identified that require attention. Claims may be vulnerable to challenge.' },
    { range: '0-40', level: 'High Risk', color: '#E74C3C', description: 'Serious issues identified. Claims are likely to be considered misleading and should be revised.' }
  ];
</script>

<svelte:head>
  <title>Methodology | Greenwash Check</title>
  <meta name="description" content="Comprehensive methodology for assessing environmental claims against Bill C-59 requirements and international greenwashing standards." />
</svelte:head>

<main class="methodology-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="container">
      <div class="hero-badge">Assessment Framework</div>
      <h1>Assessment Methodology</h1>
      <p class="hero-subtitle">
        A comprehensive, evidence-based framework for evaluating environmental claims against 
        Canada's Bill C-59 requirements and international greenwashing standards.
      </p>
    </div>
  </section>
  
  <!-- Overview Section -->
  <section class="section">
    <div class="container">
      <div class="section-header">
        <h2>Framework Overview</h2>
        <p>Our assessment methodology is built on four key dimensions, each containing specific criteria that align with regulatory requirements and best practices.</p>
      </div>
      
      <div class="overview-grid">
        <div class="overview-card">
          <div class="overview-icon" style="background: rgba(39, 174, 96, 0.1); color: #27AE60;">
            <Scale size={28} />
          </div>
          <h3>Regulatory Alignment</h3>
          <p>Directly mapped to Bill C-59 amendments to the Competition Act, ensuring assessments reflect current Canadian legal requirements.</p>
        </div>
        
        <div class="overview-card">
          <div class="overview-icon" style="background: rgba(52, 152, 219, 0.1); color: #3498DB;">
            <Award size={28} />
          </div>
          <h3>International Standards</h3>
          <p>Incorporates guidance from ISO 14021, FTC Green Guides, EU Green Claims Directive, and other international frameworks.</p>
        </div>
        
        <div class="overview-card">
          <div class="overview-icon" style="background: rgba(155, 89, 182, 0.1); color: #9B59B6;">
            <Layers size={28} />
          </div>
          <h3>Multi-Dimensional Analysis</h3>
          <p>Evaluates claims across four dimensions with 12 specific criteria, providing comprehensive coverage of greenwashing risks.</p>
        </div>
        
        <div class="overview-card">
          <div class="overview-icon" style="background: rgba(230, 126, 34, 0.1); color: #E67E22;">
            <BarChart3 size={28} />
          </div>
          <h3>Quantitative Scoring</h3>
          <p>Produces actionable risk scores with specific recommendations for improvement, enabling prioritised remediation.</p>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Bill C-59 Section -->
  <section class="section section-alt">
    <div class="container">
      <div class="section-header">
        <h2>Bill C-59 Compliance</h2>
        <p>Understanding the new Canadian requirements for environmental claims</p>
      </div>
      
      <div class="bill-content">
        <div class="bill-highlight">
          <h3>Key Amendments to the Competition Act</h3>
          <p>Bill C-59 (Budget Implementation Act, 2024) introduced significant amendments to Canada's Competition Act, creating new requirements for environmental claims:</p>
        </div>
        
        <div class="requirements-grid">
          <div class="requirement-card">
            <div class="requirement-number">1</div>
            <h4>Adequate and Proper Testing</h4>
            <p>Environmental benefit claims must be based on "adequate and proper test" — meaning claims cannot be made without supporting evidence from appropriate testing.</p>
            <div class="legal-ref">Section 74.01(1)(b.1)</div>
          </div>
          
          <div class="requirement-card">
            <div class="requirement-number">2</div>
            <h4>Internationally Recognised Methodology</h4>
            <p>Tests must be conducted "in accordance with internationally recognized methodology" — proprietary or non-standard methods are insufficient.</p>
            <div class="legal-ref">Section 74.01(1)(b.1)</div>
          </div>
          
          <div class="requirement-card">
            <div class="requirement-number">3</div>
            <h4>No Misleading Representations</h4>
            <p>Representations about environmental benefits must not be "false or misleading in a material respect" — this includes misleading impressions, not just false statements.</p>
            <div class="legal-ref">Section 74.01(1)(b)</div>
          </div>
          
          <div class="requirement-card">
            <div class="requirement-number">4</div>
            <h4>Business Activity Claims</h4>
            <p>Claims about the environmental benefits of a business or business activity (not just products) are now explicitly covered.</p>
            <div class="legal-ref">Section 74.01(1)(b.1)</div>
          </div>
        </div>
        
        <div class="penalties-box">
          <AlertTriangle size={24} />
          <div>
            <h4>Penalties for Non-Compliance</h4>
            <p>Violations can result in administrative monetary penalties of up to <strong>$10 million</strong> for first offences and <strong>$15 million</strong> for subsequent offences, or 3% of annual worldwide gross revenues if higher.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Dimensions Section -->
  <section class="section">
    <div class="container">
      <div class="section-header">
        <h2>Assessment Dimensions</h2>
        <p>Four comprehensive dimensions covering all aspects of environmental claim evaluation</p>
      </div>
      
      <div class="dimensions-list">
        {#each dimensions as dimension}
          <div class="dimension-card" class:expanded={expandedDimension === dimension.id}>
            <button class="dimension-header" onclick={() => toggleDimension(dimension.id)}>
              <div class="dimension-info">
                <div class="dimension-icon" style="background: {dimension.color}20; color: {dimension.color};">
                  <svelte:component this={dimension.icon} size={24} />
                </div>
                <div>
                  <h3>{dimension.name}</h3>
                  <p class="dimension-weight">Weight: {dimension.weight}%</p>
                </div>
              </div>
              <div class="dimension-toggle">
                {#if expandedDimension === dimension.id}
                  <ChevronUp size={24} />
                {:else}
                  <ChevronDown size={24} />
                {/if}
              </div>
            </button>
            
            {#if expandedDimension === dimension.id}
              <div class="dimension-content">
                <p class="dimension-description">{dimension.description}</p>
                
                <div class="bill-alignment">
                  <Scale size={18} />
                  <div>
                    <strong>Bill C-59 Alignment:</strong>
                    <p>{dimension.billC59Alignment}</p>
                  </div>
                </div>
                
                <h4>Assessment Criteria</h4>
                <div class="criteria-list">
                  {#each dimension.criteria as criterion}
                    <div class="criterion-card">
                      <button class="criterion-header" onclick={() => toggleCriterion(criterion.id)}>
                        <div class="criterion-info">
                          <span class="criterion-name">{criterion.name}</span>
                          <span class="criterion-weight">{criterion.weight}% of dimension</span>
                        </div>
                        {#if expandedCriterion === criterion.id}
                          <ChevronUp size={20} />
                        {:else}
                          <ChevronDown size={20} />
                        {/if}
                      </button>
                      
                      {#if expandedCriterion === criterion.id}
                        <div class="criterion-content">
                          <p>{criterion.description}</p>
                          
                          <div class="indicators-grid">
                            <div class="indicators-column positive">
                              <h5><CheckCircle size={16} /> Positive Indicators</h5>
                              <ul>
                                {#each criterion.indicators as indicator}
                                  <li>{indicator}</li>
                                {/each}
                              </ul>
                            </div>
                            
                            <div class="indicators-column negative">
                              <h5><AlertTriangle size={16} /> Red Flags</h5>
                              <ul>
                                {#each criterion.redFlags as flag}
                                  <li>{flag}</li>
                                {/each}
                              </ul>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
  
  <!-- Scoring Section -->
  <section class="section section-alt">
    <div class="container">
      <div class="section-header">
        <h2>Scoring Methodology</h2>
        <p>How we calculate and interpret greenwashing risk scores</p>
      </div>
      
      <div class="scoring-content">
        <div class="scoring-formula">
          <h3>Score Calculation</h3>
          <p>The overall risk score is calculated as a weighted average of dimension scores:</p>
          <div class="formula">
            <code>Overall Score = Σ (Dimension Score × Dimension Weight)</code>
          </div>
          <p>Each dimension score is similarly calculated from its constituent criteria scores.</p>
        </div>
        
        <div class="scoring-levels">
          <h3>Risk Levels</h3>
          <div class="levels-grid">
            {#each scoringLevels as level}
              <div class="level-card">
                <div class="level-indicator" style="background: {level.color};"></div>
                <div class="level-info">
                  <div class="level-header">
                    <span class="level-range">{level.range}</span>
                    <span class="level-name" style="color: {level.color};">{level.level}</span>
                  </div>
                  <p>{level.description}</p>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- References Section -->
  <section class="section">
    <div class="container">
      <div class="section-header">
        <h2>References & Standards</h2>
        <p>Our methodology draws from authoritative sources and international standards</p>
      </div>
      
      <div class="references-grid">
        <div class="reference-card">
          <h4>Canadian Legislation</h4>
          <ul>
            <li>Competition Act (R.S.C., 1985, c. C-34)</li>
            <li>Bill C-59 (Budget Implementation Act, 2024)</li>
            <li>Competition Bureau Environmental Claims Guidelines</li>
          </ul>
        </div>
        
        <div class="reference-card">
          <h4>International Standards</h4>
          <ul>
            <li>ISO 14021 - Environmental Labels and Declarations</li>
            <li>ISO 14024 - Type I Environmental Labelling</li>
            <li>ISO 14040/14044 - Life Cycle Assessment</li>
          </ul>
        </div>
        
        <div class="reference-card">
          <h4>Regulatory Guidance</h4>
          <ul>
            <li>FTC Green Guides (United States)</li>
            <li>EU Green Claims Directive (Proposed)</li>
            <li>CMA Green Claims Code (United Kingdom)</li>
          </ul>
        </div>
        
        <div class="reference-card">
          <h4>Academic Research</h4>
          <ul>
            <li>TerraChoice "Seven Sins of Greenwashing"</li>
            <li>Academic literature on environmental marketing</li>
            <li>Consumer perception studies</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
  
  <!-- CTA Section -->
  <section class="section cta-section">
    <div class="container">
      <div class="cta-content">
        <h2>Ready to Assess Your Claims?</h2>
        <p>Use our AI-powered tool to evaluate your environmental communications against this comprehensive framework.</p>
        <a href="/assess" class="btn btn-primary btn-large">Start Assessment</a>
      </div>
    </div>
  </section>
</main>

<style>
  .methodology-page {
    min-height: 100vh;
    background: #FAFAFA;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  
  /* Hero */
  .hero {
    background: linear-gradient(135deg, #f8fdf8 0%, #e8f5e8 100%);
    padding: 4rem 0;
    text-align: center;
    border-bottom: 1px solid #E0E0E0;
  }
  
  .hero-badge {
    display: inline-block;
    background: #6B8E6B;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
  
  .hero h1 {
    font-size: 2.5rem;
    color: #2C3E50;
    margin-bottom: 1rem;
  }
  
  .hero-subtitle {
    font-size: 1.125rem;
    color: #7F8C8D;
    max-width: 700px;
    margin: 0 auto;
    line-height: 1.7;
  }
  
  /* Sections */
  .section {
    padding: 4rem 0;
  }
  
  .section-alt {
    background: white;
  }
  
  .section-header {
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .section-header h2 {
    font-size: 2rem;
    color: #2C3E50;
    margin-bottom: 0.75rem;
  }
  
  .section-header p {
    color: #7F8C8D;
    font-size: 1.125rem;
  }
  
  /* Overview Grid */
  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .overview-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #E0E0E0;
  }
  
  .overview-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .overview-card h3 {
    font-size: 1.125rem;
    color: #2C3E50;
    margin-bottom: 0.5rem;
  }
  
  .overview-card p {
    color: #7F8C8D;
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  
  /* Bill C-59 Section */
  .bill-content {
    max-width: 900px;
    margin: 0 auto;
  }
  
  .bill-highlight {
    background: linear-gradient(135deg, #f8fdf8 0%, #e8f5e8 100%);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    border-left: 4px solid #6B8E6B;
  }
  
  .bill-highlight h3 {
    color: #2C3E50;
    margin-bottom: 0.75rem;
  }
  
  .bill-highlight p {
    color: #5D6D7E;
    line-height: 1.7;
  }
  
  .requirements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .requirement-card {
    background: #FAFAFA;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #E0E0E0;
    position: relative;
  }
  
  .requirement-number {
    position: absolute;
    top: -12px;
    left: 20px;
    width: 28px;
    height: 28px;
    background: #6B8E6B;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
  }
  
  .requirement-card h4 {
    color: #2C3E50;
    margin-bottom: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .requirement-card p {
    color: #7F8C8D;
    font-size: 0.9375rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  
  .legal-ref {
    font-size: 0.8125rem;
    color: #6B8E6B;
    font-weight: 600;
    background: rgba(107, 142, 107, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    display: inline-block;
  }
  
  .penalties-box {
    display: flex;
    gap: 1rem;
    background: #FEF3E7;
    border: 1px solid #F5D0A9;
    border-radius: 12px;
    padding: 1.5rem;
    color: #B7791F;
  }
  
  .penalties-box h4 {
    margin-bottom: 0.5rem;
    color: #92400E;
  }
  
  .penalties-box p {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  
  /* Dimensions */
  .dimensions-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .dimension-card {
    background: white;
    border-radius: 12px;
    border: 1px solid #E0E0E0;
    overflow: hidden;
  }
  
  .dimension-card.expanded {
    border-color: #6B8E6B;
  }
  
  .dimension-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  
  .dimension-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .dimension-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .dimension-info h3 {
    font-size: 1.125rem;
    color: #2C3E50;
    margin-bottom: 0.25rem;
  }
  
  .dimension-weight {
    font-size: 0.875rem;
    color: #7F8C8D;
  }
  
  .dimension-toggle {
    color: #7F8C8D;
  }
  
  .dimension-content {
    padding: 0 1.5rem 1.5rem;
    border-top: 1px solid #E0E0E0;
  }
  
  .dimension-description {
    color: #5D6D7E;
    line-height: 1.7;
    margin: 1.5rem 0;
  }
  
  .bill-alignment {
    display: flex;
    gap: 0.75rem;
    background: #F0FDF4;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    color: #166534;
  }
  
  .bill-alignment strong {
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .bill-alignment p {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  
  .dimension-content h4 {
    color: #2C3E50;
    margin-bottom: 1rem;
  }
  
  .criteria-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .criterion-card {
    background: #FAFAFA;
    border-radius: 8px;
    border: 1px solid #E0E0E0;
    overflow: hidden;
  }
  
  .criterion-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  
  .criterion-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .criterion-name {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .criterion-weight {
    font-size: 0.8125rem;
    color: #7F8C8D;
    background: #E0E0E0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }
  
  .criterion-content {
    padding: 0 1rem 1rem;
    border-top: 1px solid #E0E0E0;
  }
  
  .criterion-content > p {
    color: #5D6D7E;
    line-height: 1.6;
    margin: 1rem 0;
  }
  
  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .indicators-column {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }
  
  .indicators-column.positive {
    border: 1px solid #D1FAE5;
  }
  
  .indicators-column.negative {
    border: 1px solid #FEE2E2;
  }
  
  .indicators-column h5 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }
  
  .indicators-column.positive h5 {
    color: #166534;
  }
  
  .indicators-column.negative h5 {
    color: #991B1B;
  }
  
  .indicators-column ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .indicators-column li {
    font-size: 0.875rem;
    color: #5D6D7E;
    padding: 0.375rem 0;
    padding-left: 1rem;
    position: relative;
  }
  
  .indicators-column li::before {
    content: "•";
    position: absolute;
    left: 0;
  }
  
  /* Scoring */
  .scoring-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  
  @media (max-width: 768px) {
    .scoring-content {
      grid-template-columns: 1fr;
    }
  }
  
  .scoring-formula {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    border: 1px solid #E0E0E0;
  }
  
  .scoring-formula h3 {
    color: #2C3E50;
    margin-bottom: 1rem;
  }
  
  .scoring-formula p {
    color: #5D6D7E;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  
  .formula {
    background: #2C3E50;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
  }
  
  .formula code {
    color: #6B8E6B;
    font-family: 'Fira Code', monospace;
    font-size: 0.9375rem;
  }
  
  .scoring-levels h3 {
    color: #2C3E50;
    margin-bottom: 1rem;
  }
  
  .levels-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .level-card {
    display: flex;
    gap: 1rem;
    background: white;
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid #E0E0E0;
  }
  
  .level-indicator {
    width: 4px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  
  .level-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .level-range {
    font-weight: 700;
    color: #2C3E50;
  }
  
  .level-name {
    font-weight: 600;
    font-size: 0.875rem;
  }
  
  .level-info p {
    color: #7F8C8D;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  /* References */
  .references-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .reference-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid #E0E0E0;
  }
  
  .reference-card h4 {
    color: #2C3E50;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #6B8E6B;
  }
  
  .reference-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .reference-card li {
    color: #5D6D7E;
    font-size: 0.9375rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #F0F0F0;
  }
  
  .reference-card li:last-child {
    border-bottom: none;
  }
  
  /* CTA */
  .cta-section {
    background: linear-gradient(135deg, #6B8E6B 0%, #5A7A5A 100%);
  }
  
  .cta-content {
    text-align: center;
    color: white;
    padding: 2rem 0;
  }
  
  .cta-content h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  .cta-content p {
    font-size: 1.125rem;
    opacity: 0.9;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: white;
    color: #6B8E6B;
  }
  
  .btn-primary:hover {
    background: #F0F0F0;
    transform: translateY(-2px);
  }
  
  .btn-large {
    padding: 1rem 2rem;
    font-size: 1.0625rem;
  }
  
  @media (max-width: 768px) {
    .hero h1 {
      font-size: 2rem;
    }
    
    .section {
      padding: 3rem 0;
    }
    
    .section-header h2 {
      font-size: 1.5rem;
    }
  }
</style>
