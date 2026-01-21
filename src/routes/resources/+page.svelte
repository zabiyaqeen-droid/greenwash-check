<script lang="ts">
  import { ChevronDown, ChevronUp, ExternalLink, BookOpen, Scale, FileText, Award, AlertTriangle, Globe, Building2 } from 'lucide-svelte';
  
  let expandedSections = $state<Set<string>>(new Set(['bill-c59']));
  
  function toggleSection(id: string) {
    if (expandedSections.has(id)) {
      expandedSections.delete(id);
    } else {
      expandedSections.add(id);
    }
    expandedSections = new Set(expandedSections);
  }
  
  const resources = [
    {
      id: 'bill-c59',
      icon: Scale,
      title: 'Bill C-59: Competition Act Amendments',
      subtitle: 'Canadian federal law amendments targeting greenwashing',
      content: `
        <h4>What is Bill C-59?</h4>
        <p>Bill C-59, which received Royal Assent on June 20, 2024, introduced significant amendments to Canada's Competition Act, specifically targeting greenwashing and deceptive environmental claims.</p>
        
        <h4>Key Provisions</h4>
        <ul>
          <li><strong>Section 74.01(1)(b.2):</strong> Makes it a reviewable practice to make environmental claims without "adequate and proper substantiation in accordance with internationally recognized methodology"</li>
          <li><strong>Section 74.01(1)(b.3):</strong> Prohibits claims about a business's environmental benefits without adequate and proper substantiation</li>
          <li><strong>Reverse Onus:</strong> The burden of proof now falls on businesses to demonstrate their claims are truthful and substantiated</li>
        </ul>
        
        <h4>Penalties</h4>
        <ul>
          <li><strong>Individuals:</strong> Up to $10 million for first offence, $15 million for subsequent offences</li>
          <li><strong>Corporations:</strong> Up to $10 million or 3% of worldwide gross revenues (whichever is greater) for first offence</li>
          <li><strong>Private Right of Action:</strong> Individuals can now bring private actions for deceptive marketing practices</li>
        </ul>
        
        <h4>Effective Date</h4>
        <p>The greenwashing provisions came into force on June 20, 2025, giving businesses one year to prepare for compliance.</p>
      `,
      links: [
        { title: 'Full Text of Bill C-59', url: 'https://www.parl.ca/legisinfo/en/bill/44-1/c-59' },
        { title: 'Competition Bureau Guidance', url: 'https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/environmental-claims-and-competition-act' }
      ]
    },
    {
      id: 'competition-bureau',
      icon: Building2,
      title: 'Competition Bureau Guidelines',
      subtitle: 'Official guidance on environmental claims compliance',
      content: `
        <h4>The 6 Principles for Environmental Claims</h4>
        <p>The Competition Bureau has established six key principles that all environmental claims must meet:</p>
        
        <ol>
          <li><strong>Truthful:</strong> Claims must be accurate and not create false impressions about environmental benefits</li>
          <li><strong>Substantiated:</strong> Claims must be supported by adequate and proper testing using internationally recognized methodology</li>
          <li><strong>Clear and Specific:</strong> Claims must be clear, specific, and not vague or overly broad</li>
          <li><strong>Relevant:</strong> Environmental benefits claimed must be relevant to the product or service</li>
          <li><strong>Complete:</strong> Claims must not omit important information that could mislead consumers</li>
          <li><strong>Verifiable:</strong> Consumers should be able to verify the claims made</li>
        </ol>
        
        <h4>What Constitutes "Adequate and Proper Substantiation"?</h4>
        <p>The Bureau expects businesses to:</p>
        <ul>
          <li>Use internationally recognized standards (e.g., ISO 14021, ISO 14040/14044 for LCA)</li>
          <li>Have substantiation in place <em>before</em> making claims</li>
          <li>Use appropriate testing methodology for the specific claim</li>
          <li>Document and retain evidence of substantiation</li>
        </ul>
      `,
      links: [
        { title: 'Environmental Claims and the Competition Act', url: 'https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/environmental-claims-and-competition-act' },
        { title: 'Deceptive Marketing Practices', url: 'https://competition-bureau.canada.ca/en/deceptive-marketing-practices' }
      ]
    },
    {
      id: 'iso-14021',
      icon: Award,
      title: 'ISO 14021: Environmental Labels and Declarations',
      subtitle: 'International standard for self-declared environmental claims',
      content: `
        <h4>What is ISO 14021?</h4>
        <p>ISO 14021 is an international standard that provides guidance on self-declared environmental claims (Type II environmental labelling). It is referenced by the Competition Bureau as a key methodology for substantiating environmental claims.</p>
        
        <h4>Key Requirements</h4>
        <ul>
          <li><strong>Accuracy:</strong> Claims must be accurate, verifiable, and not misleading</li>
          <li><strong>Specificity:</strong> Claims must be specific and relate to a clearly defined aspect</li>
          <li><strong>Relevance:</strong> Claims must be relevant to the product's environmental impact</li>
          <li><strong>Substantiation:</strong> Claims must be supported by competent and reliable evidence</li>
          <li><strong>Comparisons:</strong> Comparative claims must use the same methodology and be recent</li>
        </ul>
        
        <h4>Common Claim Types Covered</h4>
        <ul>
          <li>Recyclable / Recycled content</li>
          <li>Reduced energy consumption</li>
          <li>Reduced water usage</li>
          <li>Compostable / Biodegradable</li>
          <li>Reduced emissions</li>
          <li>Extended product life</li>
        </ul>
        
        <h4>Prohibited Practices</h4>
        <ul>
          <li>Vague or non-specific claims (e.g., "eco-friendly", "green", "sustainable" without qualification)</li>
          <li>Claims that cannot be verified</li>
          <li>Claims based on absence of harmful ingredients that were never present</li>
          <li>Misleading imagery or symbols</li>
        </ul>
      `,
      links: [
        { title: 'ISO 14021 Standard', url: 'https://www.iso.org/standard/66652.html' },
        { title: 'ISO 14020 Series Overview', url: 'https://www.iso.org/standard/79479.html' }
      ]
    },
    {
      id: 'enforcement',
      icon: AlertTriangle,
      title: 'Enforcement Actions & Case Studies',
      subtitle: 'Recent greenwashing enforcement in Canada and globally',
      content: `
        <h4>Canadian Enforcement Landscape</h4>
        <p>With Bill C-59 now in effect, the Competition Bureau has signaled increased scrutiny of environmental claims. Key areas of focus include:</p>
        <ul>
          <li>Net-zero and carbon neutrality claims</li>
          <li>Recyclability and sustainability claims</li>
          <li>Environmental certifications and labels</li>
          <li>Climate commitments and targets</li>
        </ul>
        
        <h4>Notable International Cases</h4>
        <ul>
          <li><strong>Shell (Netherlands, 2021):</strong> Court ordered Shell to reduce emissions by 45% by 2030, finding their climate strategy inadequate</li>
          <li><strong>TotalEnergies (France, 2023):</strong> Fined for misleading carbon neutrality claims</li>
          <li><strong>KLM (Netherlands, 2024):</strong> Ordered to stop "Fly Responsibly" campaign as misleading</li>
          <li><strong>HSBC (UK, 2022):</strong> Advertising Standards Authority banned ads for misleading net-zero claims</li>
        </ul>
        
        <h4>Risk Factors for Enforcement</h4>
        <ul>
          <li>High-profile companies with significant environmental footprints</li>
          <li>Consumer-facing claims in advertising and marketing</li>
          <li>Claims that are easily contradicted by public data</li>
          <li>Competitor complaints or NGO campaigns</li>
        </ul>
      `,
      links: [
        { title: 'Competition Bureau Compliance & Enforcement', url: 'https://competition-bureau.canada.ca/en/how-we-foster-competition/compliance-and-enforcement' }
      ]
    },
    {
      id: 'global-regulations',
      icon: Globe,
      title: 'Global Greenwashing Regulations',
      subtitle: 'International regulatory landscape comparison',
      content: `
        <h4>European Union</h4>
        <p>The EU Green Claims Directive (proposed 2023) will require:</p>
        <ul>
          <li>Pre-approval of environmental claims by independent verifiers</li>
          <li>Life cycle assessment for comparative claims</li>
          <li>Ban on generic claims without proof</li>
          <li>Restrictions on carbon offset-based neutrality claims</li>
        </ul>
        
        <h4>United Kingdom</h4>
        <p>The Competition and Markets Authority (CMA) Green Claims Code requires:</p>
        <ul>
          <li>Claims must be truthful and accurate</li>
          <li>Claims must be clear and unambiguous</li>
          <li>Claims must not omit important information</li>
          <li>Comparisons must be fair and meaningful</li>
          <li>Claims must be substantiated</li>
          <li>Claims must consider full life cycle</li>
        </ul>
        
        <h4>United States</h4>
        <p>The FTC Green Guides provide guidance on:</p>
        <ul>
          <li>General environmental benefit claims</li>
          <li>Carbon offset claims</li>
          <li>Certifications and seals</li>
          <li>Recyclable and compostable claims</li>
        </ul>
        <p>Note: The SEC has proposed climate disclosure rules that would require public companies to disclose climate-related risks and emissions.</p>
        
        <h4>Australia</h4>
        <p>ACCC has issued guidance and taken enforcement action against greenwashing, with significant fines for misleading environmental claims.</p>
      `,
      links: [
        { title: 'EU Green Claims Directive', url: 'https://environment.ec.europa.eu/topics/circular-economy/green-claims_en' },
        { title: 'UK CMA Green Claims Code', url: 'https://www.gov.uk/government/publications/green-claims-code-making-environmental-claims' },
        { title: 'FTC Green Guides', url: 'https://www.ftc.gov/news-events/topics/truth-advertising/green-guides' }
      ]
    },
    {
      id: 'best-practices',
      icon: BookOpen,
      title: 'Best Practices for Compliant Claims',
      subtitle: 'How to make environmental claims that comply with regulations',
      content: `
        <h4>Before Making a Claim</h4>
        <ol>
          <li><strong>Assess the claim:</strong> Is it truthful, specific, and relevant?</li>
          <li><strong>Gather substantiation:</strong> Do you have adequate evidence using recognized methodology?</li>
          <li><strong>Consider the full picture:</strong> Does the claim consider the full life cycle? Are there trade-offs?</li>
          <li><strong>Review for clarity:</strong> Will consumers understand the claim correctly?</li>
          <li><strong>Document everything:</strong> Keep records of all substantiation and decision-making</li>
        </ol>
        
        <h4>Claim Formulation Tips</h4>
        <ul>
          <li><strong>Be specific:</strong> "Made with 30% post-consumer recycled plastic" instead of "eco-friendly packaging"</li>
          <li><strong>Qualify appropriately:</strong> "Recyclable where facilities exist" instead of just "recyclable"</li>
          <li><strong>Use recognized standards:</strong> Reference ISO standards, third-party certifications</li>
          <li><strong>Avoid absolutes:</strong> "Reduced emissions by 20%" instead of "zero emissions"</li>
          <li><strong>Disclose limitations:</strong> Be transparent about scope and methodology</li>
        </ul>
        
        <h4>Red Flags to Avoid</h4>
        <ul>
          <li>Vague terms: "green", "eco-friendly", "sustainable", "natural" without qualification</li>
          <li>Irrelevant claims: Highlighting absence of substances never used in the category</li>
          <li>Hidden trade-offs: Emphasizing one benefit while ignoring negative impacts</li>
          <li>False labels: Using fake certifications or misleading imagery</li>
          <li>Unsubstantiated future commitments: "Net zero by 2050" without credible pathway</li>
        </ul>
        
        <h4>Ongoing Compliance</h4>
        <ul>
          <li>Regularly review and update claims as circumstances change</li>
          <li>Train marketing and communications teams on compliance requirements</li>
          <li>Establish internal review processes for environmental claims</li>
          <li>Monitor regulatory developments and update practices accordingly</li>
        </ul>
      `,
      links: [
        { title: 'Try Muuvment IQ for Compliance Guidance', url: 'https://app.muuvment.com/ai/assistant' }
      ]
    }
  ];
</script>

<div class="resources-page">
  <div class="container">
    <div class="page-header">
      <h1>Expert Resources</h1>
      <p class="subtitle">Comprehensive guides on greenwashing regulations, compliance requirements, and best practices for environmental claims in Canada and globally.</p>
    </div>
    
    <div class="methodology-note">
      <p>We've taken all of these resources into consideration when creating our methodology and assessment framework. Did we miss something? Email us at <a href="mailto:info@muuvment.com">info@muuvment.com</a> to help us improve this free product.</p>
    </div>
    
    <div class="resources-list">
      {#each resources as resource}
        <div class="resource-card" class:expanded={expandedSections.has(resource.id)}>
          <button class="resource-header" onclick={() => toggleSection(resource.id)}>
            <div class="resource-icon">
              <svelte:component this={resource.icon} size={24} />
            </div>
            <div class="resource-info">
              <h3>{resource.title}</h3>
              <p>{resource.subtitle}</p>
            </div>
            <div class="expand-icon">
              {#if expandedSections.has(resource.id)}
                <ChevronUp size={24} />
              {:else}
                <ChevronDown size={24} />
              {/if}
            </div>
          </button>
          
          {#if expandedSections.has(resource.id)}
            <div class="resource-content">
              {@html resource.content}
              
              {#if resource.links && resource.links.length > 0}
                <div class="resource-links">
                  <h4>Learn More</h4>
                  <div class="links-list">
                    {#each resource.links as link}
                      <a href={link.url} target="_blank" rel="noopener noreferrer" class="resource-link">
                        {link.title}
                        <ExternalLink size={14} />
                      </a>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    <!-- CTA Section -->
    <div class="cta-section">
      <div class="cta-content">
        <!-- Greenwash Check CTA -->
        <div class="cta-block">
          <h2>Ready to Check Your Environmental Claims?</h2>
          <p>Use our free assessment tool to analyse your sustainability reports and marketing materials against Bill C-59 and Competition Bureau guidelines.</p>
          <a href="/assess" class="cta-primary">Run Free Assessment</a>
        </div>
        
        <!-- Muuvment IQ CTA - Separate -->
        <div class="cta-divider"></div>
        <div class="cta-block cta-secondary-block">
          <h3>Need More Comprehensive ESG Support?</h3>
          <p>Learn why the most innovative sustainability teams are using <strong>Muuvment IQ</strong> to reclaim their time and deliver exceptional sustainability results.</p>
          <a href="https://app.muuvment.com/ai/assistant" target="_blank" rel="noopener noreferrer" class="cta-secondary">
            Try Muuvment IQ
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .resources-page {
    min-height: calc(100vh - 200px);
    padding: 2rem 1rem;
    background: #F8FAF8;
  }
  
  .container {
    max-width: 900px;
    margin: 0 auto;
  }
  
  .page-header {
    margin-bottom: 1.5rem;
  }
  
  .methodology-note {
    background: #F0FDF4;
    border: 1px solid #86EFAC;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 2rem;
  }
  
  .methodology-note p {
    margin: 0;
    color: #166534;
    font-size: 0.95rem;
    line-height: 1.6;
  }
  
  .methodology-note a {
    color: #15803D;
    font-weight: 600;
    text-decoration: underline;
  }
  
  .methodology-note a:hover {
    color: #166534;
  }
  
  h1 {
    font-size: 2rem;
    color: #2C3E50;
    margin-bottom: 0.5rem;
  }
  
  .subtitle {
    color: #5A6A7A;
    font-size: 1.1rem;
    line-height: 1.6;
  }
  
  .resources-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 3rem;
  }
  
  .resource-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    overflow: hidden;
    border: 1px solid #E0E0E0;
    transition: border-color 0.2s;
  }
  
  .resource-card.expanded {
    border-color: #6B8E6B;
  }
  
  .resource-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.2s;
  }
  
  .resource-header:hover {
    background: #F8F9FA;
  }
  
  .resource-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: #F0FFF0;
    border-radius: 10px;
    color: #6B8E6B;
    flex-shrink: 0;
  }
  
  .resource-info {
    flex: 1;
  }
  
  .resource-info h3 {
    margin: 0 0 0.25rem;
    color: #2C3E50;
    font-size: 1.1rem;
  }
  
  .resource-info p {
    margin: 0;
    color: #5A6A7A;
    font-size: 0.9rem;
  }
  
  .expand-icon {
    color: #7F8C8D;
  }
  
  .resource-content {
    padding: 0 1.5rem 1.5rem;
    border-top: 1px solid #E0E0E0;
    background: #FAFAFA;
  }
  
  .resource-content :global(h4) {
    color: #2C3E50;
    margin: 1.5rem 0 0.75rem;
    font-size: 1rem;
  }
  
  .resource-content :global(h4:first-child) {
    margin-top: 1.5rem;
  }
  
  .resource-content :global(p) {
    color: #5A6A7A;
    line-height: 1.7;
    margin: 0 0 1rem;
  }
  
  .resource-content :global(ul),
  .resource-content :global(ol) {
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  }
  
  .resource-content :global(li) {
    color: #5A6A7A;
    line-height: 1.7;
    margin-bottom: 0.5rem;
  }
  
  .resource-content :global(strong) {
    color: #2C3E50;
  }
  
  .resource-content :global(em) {
    font-style: italic;
  }
  
  .resource-links {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #E0E0E0;
  }
  
  .resource-links h4 {
    margin: 0 0 0.75rem !important;
  }
  
  .links-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  
  .resource-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    color: #6B8E6B;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .resource-link:hover {
    background: #F0FFF0;
    border-color: #6B8E6B;
  }
  
  /* CTA Section */
  .cta-section {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
  }
  
  .cta-content h2 {
    color: white;
    margin: 0 0 1rem;
    font-size: 1.5rem;
  }
  
  .cta-content > p {
    color: #E2E8F0;
    margin: 0 0 1.5rem;
    line-height: 1.6;
  }
  
  .cta-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  
  .cta-primary {
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
  
  .cta-primary:hover {
    background: #5A7A5A;
  }
  
  .cta-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    background: transparent;
    border: 1px solid #475569;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .cta-secondary:hover {
    background: rgba(255,255,255,0.1);
    border-color: #6B8E6B;
  }
  
  .cta-note {
    color: #FCD34D !important;
    font-weight: 600;
    font-size: 0.9rem;
    margin: 0 !important;
  }
  
  .cta-subtext {
    color: #CBD5E1 !important;
    font-size: 0.9rem;
    margin-top: 1rem !important;
    line-height: 1.5;
  }
  
  @media (max-width: 768px) {
    .resource-header {
      flex-wrap: wrap;
    }
    
    .resource-icon {
      width: 40px;
      height: 40px;
    }
    
    .resource-info h3 {
      font-size: 1rem;
    }
    
    .cta-buttons {
      flex-direction: column;
    }
    
    .cta-primary, .cta-secondary {
      width: 100%;
      justify-content: center;
    }
  }

  .cta-block {
    text-align: center;
  }
  
  .cta-divider {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
    margin: 2rem 0;
  }
  
  .cta-secondary-block h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: #E2E8F0;
  }
  
  .cta-secondary-block p {
    color: #CBD5E1;
    margin-bottom: 1rem;
  }
  
  .cta-block p {
    color: #E2E8F0;
  }
</style>
