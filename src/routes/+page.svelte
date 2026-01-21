<script lang="ts">
  import { user } from '$lib/stores/user';
  import { onMount } from 'svelte';
  import { Shield, FileCheck, Scale, ArrowRight, CheckCircle, Globe, MapPin, Building2, FileText } from 'lucide-svelte';
  
  let currentUser = $state<any>(null);
  
  onMount(() => {
    user.init();
    user.subscribe(u => {
      currentUser = u;
    });
  });
  
  const features = [
    {
      icon: Shield,
      title: 'Bill C-59 Compliant',
      description: 'Assessment criteria aligned with Canada\'s Competition Act amendments and Competition Bureau\'s 6 official principles for environmental claims.'
    },
    {
      icon: FileCheck,
      title: 'Transparent Methodology',
      description: 'Full visibility into evaluation criteria with customisable importance levels. Understand exactly how your claims are assessed.'
    },
    {
      icon: Scale,
      title: 'International Standards',
      description: 'Built on ISO 14021 requirements and peer-reviewed research including the Nemes et al. (2022) greenwashing framework.'
    }
  ];
  
  const regions = [
    { code: 'CA', name: 'Canada', flag: '🇨🇦', status: 'active', description: 'Bill C-59 & Competition Bureau' },
    { code: 'EU', name: 'European Union', flag: '🇪🇺', status: 'coming', description: 'Green Claims Directive' },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', status: 'coming', description: 'CMA Green Claims Code' },
    { code: 'US', name: 'United States', flag: '🇺🇸', status: 'coming', description: 'FTC Green Guides' }
  ];
</script>

<svelte:head>
  <title>Greenwash Check | AI-Powered Bill C-59 Greenwashing Assessment for Canada</title>
  <meta name="description" content="Evaluate your environmental claims against Canada's Bill C-59 requirements and Competition Bureau guidelines. Free AI-powered greenwashing risk assessment." />
</svelte:head>

<div class="page">
  <main>
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-badge">
          <span>Powered by MUUVMENT</span>
        </div>
        <div class="title-row">
          <h1>AI-Powered Bill C-59 Greenwashing Assessment</h1>
          <span class="beta-pill">BETA</span>
        </div>
        <p class="hero-subtitle">
          Evaluate your environmental claims against Canada's Bill C-59 requirements, 
          Competition Bureau guidelines, and international standards.
        </p>
        
        <div class="hero-actions">
          {#if currentUser}
            <a href="/assess" class="btn btn-primary btn-lg">
              Start Assessment
              <ArrowRight size={20} />
            </a>
          {:else}
            <a href="/login" class="btn btn-primary btn-lg">
              Get Started Free
              <ArrowRight size={20} />
            </a>
          {/if}
          <a href="/methodology" class="btn btn-outline btn-lg">
            View Methodology
          </a>
        </div>
        
        <div class="hero-trust">
          <CheckCircle size={16} />
          <span>Based on Competition Bureau's 6 Principles & Bill C-59</span>
        </div>
      </div>
    </section>
    
    <!-- Regional Coverage Section -->
    <section class="regions">
      <div class="container">
        <div class="regions-header">
          <Globe size={24} />
          <h2>Regional Coverage</h2>
        </div>
        <p class="regions-subtitle">Greenwash Check is expanding to cover major regulatory frameworks worldwide</p>
        
        <div class="region-grid">
          {#each regions as region}
            <div class="region-card {region.status}">
              <div class="region-flag">{region.flag}</div>
              <div class="region-info">
                <div class="region-name-row">
                  <h3>{region.name}</h3>
                  {#if region.status === 'active'}
                    <span class="status-badge active">
                      <CheckCircle size={12} />
                      Active
                    </span>
                  {:else}
                    <span class="status-badge coming">Coming Soon</span>
                  {/if}
                </div>
                <p class="region-framework">{region.description}</p>
              </div>
              {#if region.status === 'active'}
                <a href={currentUser ? '/assess' : '/login'} class="region-cta">
                  Assess Now <ArrowRight size={16} />
                </a>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
    
    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2>Why Use Greenwash Check?</h2>
        <div class="feature-grid">
          {#each features as feature}
            <div class="feature-card">
              <div class="feature-icon">
                <svelte:component this={feature.icon} size={32} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          {/each}
        </div>
      </div>
    </section>
    
    <!-- Legal Framework Section -->
    <section class="legal-framework">
      <div class="container">
        <h2>Built on Canadian Legal Framework</h2>
        <div class="framework-grid">
          <div class="framework-card">
            <div class="framework-icon">
              <FileText size={28} />
            </div>
            <h3>Competition Act (Bill C-59)</h3>
            <p>Paragraphs 74.01(1)(a), (b), (b.1), and (b.2) addressing false or misleading environmental representations and substantiation requirements.</p>
            <a href="https://laws-lois.justice.gc.ca/eng/acts/c-34/page-6.html" target="_blank" rel="noopener" class="framework-link">
              View Legislation ↗
            </a>
          </div>
          <div class="framework-card">
            <div class="framework-icon">
              <Building2 size={28} />
            </div>
            <h3>Competition Bureau Guidelines</h3>
            <p>Six official principles for compliance: truthfulness, adequate testing, specific comparisons, no exaggeration, clarity, and future claims substantiation.</p>
            <a href="https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/environmental-claims-and-competition-act" target="_blank" rel="noopener" class="framework-link">
              View Guidelines ↗
            </a>
          </div>
          <div class="framework-card">
            <div class="framework-icon">
              <Globe size={28} />
            </div>
            <h3>ISO 14021 Standard</h3>
            <p>International requirements for self-declared environmental claims, including prohibited vague terms and specific claim substantiation requirements.</p>
            <a href="https://www.iso.org/standard/66652.html" target="_blank" rel="noopener" class="framework-link">
              View Standard ↗
            </a>
          </div>
        </div>
      </div>
    </section>
    
    <!-- CTA Section -->
    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <div class="cta-flag">🇨🇦</div>
          <h2>Ready to assess your environmental claims for Canada?</h2>
          <p>Get started with our free greenwashing assessment tool, built specifically for Canadian regulatory requirements.</p>
          <a href={currentUser ? '/assess' : '/login'} class="btn btn-primary btn-lg">
            {currentUser ? 'Start Assessment' : 'Get Started Free'}
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .page {
    min-height: 100vh;
  }
  
  .hero {
    background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%);
    padding: 5rem 1.5rem;
    text-align: center;
  }
  
  .hero-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .hero-badge {
    display: inline-block;
    background: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    color: #4A428E;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    font-weight: 500;
  }
  
  .title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  
  .title-row h1 {
    font-size: 2.75rem;
    margin: 0;
    color: #1C2947;
  }
  
  .beta-pill {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 0.4rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
    color: #5A6A7A;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  
  .hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }
  
  .hero-trust {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #4A428E;
    font-size: 0.9rem;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }
  
  .btn-primary {
    background: #356904;
    color: white;
  }
  
  .btn-primary:hover {
    background: #2A5403;
  }
  
  .btn-outline {
    background: transparent;
    color: #4A428E;
    border: 2px solid #4A428E;
  }
  
  .btn-outline:hover {
    background: #356904;
    color: white;
  }
  
  .btn-lg {
    padding: 1rem 2rem;
    font-size: 1.1rem;
  }
  
  /* Regional Coverage Section */
  .regions {
    padding: 4rem 1.5rem;
    background: white;
  }
  
  .regions-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    color: #1C2947;
  }
  
  .regions-header h2 {
    font-size: 1.75rem;
    margin: 0;
  }
  
  .regions-subtitle {
    text-align: center;
    color: #64748B;
    margin-bottom: 2.5rem;
  }
  
  .region-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .region-card {
    background: #F8FAFC;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    border: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .region-card.active {
    background: #F0FDF4;
    border-color: #10B981;
  }
  
  .region-card.coming {
    opacity: 0.7;
  }
  
  .region-flag {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
  }
  
  .region-name-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .region-name-row h3 {
    font-size: 1rem;
    margin: 0;
    color: #1C2947;
  }
  
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .status-badge.active {
    background: #10B981;
    color: white;
  }
  
  .status-badge.coming {
    background: #F59E0B;
    color: white;
  }
  
  .region-framework {
    font-size: 0.8125rem;
    color: #64748B;
    margin: 0;
  }
  
  .region-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 1rem;
    color: #4A428E;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: gap 0.2s;
  }
  
  .region-cta:hover {
    gap: 0.5rem;
  }
  
  /* Features Section */
  .features {
    padding: 5rem 1.5rem;
    background: #F8FAFC;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .features h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
    color: #1C2947;
  }
  
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .feature-card {
    text-align: center;
    padding: 2rem;
    border-radius: 12px;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  
  .feature-icon {
    width: 64px;
    height: 64px;
    background: #F0FDF4;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    color: #4A428E;
  }
  
  .feature-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: #1C2947;
  }
  
  .feature-card p {
    color: #64748B;
    line-height: 1.6;
    margin: 0;
  }
  
  /* Legal Framework Section */
  .legal-framework {
    padding: 5rem 1.5rem;
    background: white;
  }
  
  .legal-framework h2 {
    text-align: center;
    font-size: 2rem;
    margin-bottom: 3rem;
    color: #1C2947;
  }
  
  .framework-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }
  
  .framework-card {
    padding: 2rem;
    border-radius: 12px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
  }
  
  .framework-icon {
    width: 56px;
    height: 56px;
    background: #0F172A;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
    color: white;
  }
  
  .framework-card h3 {
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
    color: #1C2947;
  }
  
  .framework-card p {
    color: #64748B;
    line-height: 1.6;
    margin: 0 0 1rem 0;
    font-size: 0.9375rem;
  }
  
  .framework-link {
    color: #4A428E;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .framework-link:hover {
    color: #3D3676;
  }
  
  /* CTA Section */
  .cta {
    padding: 5rem 1.5rem;
    background: #0F172A;
    text-align: center;
  }
  
  .cta-content {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .cta-flag {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .cta h2 {
    color: white;
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  .cta p {
    color: #94A3B8;
    font-size: 1.1rem;
    margin-bottom: 2rem;
    line-height: 1.6;
  }
  
  @media (max-width: 768px) {
    .hero {
      padding: 3rem 1rem;
    }
    
    .title-row {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .title-row h1 {
      font-size: 1.75rem;
      text-align: center;
    }
    
    .hero-subtitle {
      font-size: 1rem;
      padding: 0 0.5rem;
    }
    
    .hero-actions {
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    
    .btn-lg {
      width: 100%;
      justify-content: center;
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    }
    
    .region-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    
    .region-card {
      padding: 1rem;
    }
    
    .region-flag {
      font-size: 2rem;
    }
    
    .feature-grid,
    .framework-grid {
      grid-template-columns: 1fr;
    }
    
    .features,
    .regional,
    .framework {
      padding: 3rem 1rem;
    }
    
    .features h2,
    .regional h2,
    .framework h2 {
      font-size: 1.5rem;
    }
  }
  
  @media (max-width: 480px) {
    .title-row h1 {
      font-size: 1.5rem;
    }
    
    .region-grid {
      grid-template-columns: 1fr;
    }
    
    .beta-pill {
      font-size: 0.75rem;
      padding: 0.3rem 0.75rem;
    }
  }
</style>
