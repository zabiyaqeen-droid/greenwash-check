<script lang="ts">
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/user';
  import { Linkedin, Mail, Share2 } from 'lucide-svelte';

  let mode: 'signin' | 'register' = 'register';
  let loading = false;
  let error = '';

  let name = '';
  let email = '';
  let company = '';
  let jobTitle = '';
  let linkedIn = '';

  async function handleRegister() {
    if (!name || !email || !company || !linkedIn) {
      error = 'Please fill in all required fields (including LinkedIn profile)';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, jobTitle, linkedIn })
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      user.login({ name, email, company, jobTitle, linkedIn });

      // Track login
      await fetch('/api/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, isNewUser: true })
      });

      goto('/assess');
    } catch (e) {
      error = 'Registration failed. Please try again.';
    } finally {
      loading = false;
    }
  }

  async function handleSignIn() {
    if (!email) {
      error = 'Please enter your email';
      return;
    }

    loading = true;
    error = '';

    try {
      // For demo, just log them in with email
      user.login({ name: email.split('@')[0], email, company: 'Unknown' });

      await fetch('/api/track-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: email.split('@')[0], email, company: 'Unknown', isNewUser: false })
      });

      goto('/assess');
    } catch (e) {
      error = 'Sign in failed. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Get Started Free | Greenwash Check</title>
</svelte:head>

<div class="login-page">
  <div class="login-container">
    <div class="login-card">
      <div class="free-badge">100% Free</div>
      <h1>Get Started Free</h1>
      <p class="subtitle">Access the Greenwash Check tool at no cost — no credit card required.</p>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      {#if mode === 'register'}
        <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
          <div class="form-group">
            <label for="name">Full Name <span class="required">*</span></label>
            <input type="text" id="name" bind:value={name} placeholder="John Smith" required />
          </div>

          <div class="form-group">
            <label for="email">Work Email <span class="required">*</span></label>
            <input type="email" id="email" bind:value={email} placeholder="john@company.com" required />
          </div>

          <div class="form-group">
            <label for="company">Company Name <span class="required">*</span></label>
            <input type="text" id="company" bind:value={company} placeholder="Acme Corp" required />
          </div>

          <div class="form-group">
            <label for="jobTitle">Job Title</label>
            <input type="text" id="jobTitle" bind:value={jobTitle} placeholder="Sustainability Manager" />
          </div>

          <div class="form-group">
            <label for="linkedIn">LinkedIn Profile URL <span class="required">*</span></label>
            <input type="url" id="linkedIn" bind:value={linkedIn} placeholder="https://linkedin.com/in/yourprofile" required />
          </div>

          <button type="submit" class="btn btn-primary btn-full" disabled={loading}>
            {#if loading}
              <span class="spinner"></span> Creating account...
            {:else}
              Create Free Account
            {/if}
          </button>
        </form>

        <p class="switch-mode">
          Already have an account? <button type="button" onclick={() => mode = 'signin'}>Sign in</button>
        </p>
      {:else}
        <form onsubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
          <div class="form-group">
            <label for="signin-email">Email</label>
            <input type="email" id="signin-email" bind:value={email} placeholder="john@company.com" required />
          </div>

          <button type="submit" class="btn btn-primary btn-full" disabled={loading}>
            {#if loading}
              <span class="spinner"></span> Signing in...
            {:else}
              Sign In Free
            {/if}
          </button>
        </form>

        <p class="switch-mode">
          Don't have an account? <button type="button" onclick={() => mode = 'register'}>Register free</button>
        </p>
      {/if}

      <p class="terms">By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
    </div>
    
    <div class="mission-card">
      <h2>Why Is This Free?</h2>
      <p>We make Greenwash Check free to support companies in being compliant with Bill C-59 and to protect consumers from false advertising.</p>
      <p>Our mission is to <strong>protect the integrity of ESG and sustainability</strong> — ensuring that environmental claims are truthful, substantiated, and meaningful.</p>
      
      <div class="support-section">
        <h3>Want to Help?</h3>
        <p>If you find this tool valuable, here's how you can support us:</p>
        
        <div class="support-options">
          <a href="https://www.linkedin.com/company/muuvment/" target="_blank" rel="noopener" class="support-option">
            <Linkedin size={20} />
            <span>Follow us on LinkedIn</span>
          </a>
          
          <button type="button" class="support-option" onclick={() => { if (typeof navigator !== 'undefined' && navigator.share) { navigator.share({title: 'Greenwash Check', text: 'Free Bill C-59 greenwashing assessment tool', url: window.location.origin}); } else { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.origin), '_blank'); } }}>
            <Share2 size={20} />
            <span>Share with others</span>
          </button>
          
          <a href="mailto:info@muuvment.com?subject=Greenwash Check Feedback" class="support-option">
            <Mail size={20} />
            <span>Send us feedback</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: #F8FAF8;
  }
  
  .login-container {
    display: flex;
    gap: 2rem;
    max-width: 900px;
    width: 100%;
    align-items: stretch;
  }

  .login-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
    padding: 2.5rem;
    flex: 1;
    max-width: 440px;
    position: relative;
  }
  
  .free-badge {
    position: absolute;
    top: -12px;
    right: 24px;
    background: linear-gradient(135deg, #356904 0%, #2A5403 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
  }

  h1 {
    text-align: center;
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    color: #0F172A;
  }

  .subtitle {
    text-align: center;
    color: #64748B;
    margin: 0 0 2rem 0;
    font-size: 0.95rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #334155;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #4A428E;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
  }

  .required {
    color: #E74C3C;
  }

  .btn-full {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    background: linear-gradient(135deg, #356904 0%, #2A5403 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .btn-full:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  }
  
  .btn-full:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .switch-mode {
    text-align: center;
    margin-top: 1.5rem;
    color: #64748B;
  }

  .switch-mode button {
    background: none;
    border: none;
    color: #4A428E;
    font-weight: 600;
    cursor: pointer;
  }
  
  .switch-mode button:hover {
    text-decoration: underline;
  }

  .terms {
    text-align: center;
    font-size: 0.8rem;
    color: #64748B;
    margin-top: 1.5rem;
  }

  .terms a {
    color: #4A428E;
  }

  .error-message {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  /* Mission Card */
  .mission-card {
    background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%);
    border: 1px solid #BBF7D0;
    border-radius: 16px;
    padding: 2rem;
    flex: 1;
    max-width: 380px;
    display: flex;
    flex-direction: column;
  }
  
  .mission-card h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #166534;
  }
  
  .mission-card > p {
    color: #15803D;
    line-height: 1.6;
    margin: 0 0 1rem 0;
    font-size: 0.95rem;
  }
  
  .mission-card strong {
    color: #166534;
  }
  
  .support-section {
    margin-top: auto;
    padding-top: 1.5rem;
    border-top: 1px solid #BBF7D0;
  }
  
  .support-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: #166534;
  }
  
  .support-section > p {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    color: #15803D;
  }
  
  .support-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .support-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #BBF7D0;
    border-radius: 8px;
    color: #166534;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .support-option:hover {
    background: #166534;
    color: white;
    border-color: #166534;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .login-page {
      padding: 1rem;
    }
    
    .login-container {
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    
    .login-card,
    .mission-card {
      max-width: 100%;
      padding: 1.5rem;
    }
    
    .login-card h1 {
      font-size: 1.5rem;
    }
    
    .mission-card {
      order: 2;
    }
    
    .mission-card h2 {
      font-size: 1.25rem;
    }
    
    .support-options {
      flex-direction: column;
    }
    
    .support-option {
      width: 100%;
      justify-content: center;
    }
    
    .free-badge {
      right: 16px;
      font-size: 0.7rem;
      padding: 0.3rem 0.6rem;
    }
  }
  
  @media (max-width: 480px) {
    .login-card,
    .mission-card {
      padding: 1.25rem;
    }
    
    .form-group label {
      font-size: 0.85rem;
    }
    
    .form-group input {
      padding: 0.625rem;
    }
  }
</style>
