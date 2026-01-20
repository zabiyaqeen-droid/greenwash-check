<script lang="ts">
  import { user } from '$lib/stores/user';
  import { LogOut, User, Menu, X, ChevronDown } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  
  let mobileMenuOpen = $state(false);
  let productsDropdownOpen = $state(false);
  let currentUser = $state<any>(null);
  
  $effect(() => {
    user.subscribe(u => {
      currentUser = u;
    });
  });
  
  function handleLogout() {
    user.logout();
    goto('/login');
  }
  
  function closeDropdowns() {
    productsDropdownOpen = false;
  }
</script>

<svelte:window on:click={closeDropdowns} />

<header class="header">
  <div class="header-content">
    <a href="/" class="logo">
      <!-- Muuvment Logo - Two overlapping M shapes -->
      <svg width="32" height="24" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 26V8L10 2L18 8V26" stroke="#1a2b4a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M22 26V8L30 2L38 8V26" stroke="#1a2b4a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      <span class="logo-text">MUUVMENT</span>
    </a>
    
    <nav class="nav-desktop">
      <!-- Products Dropdown -->
      <div class="nav-dropdown" role="button" tabindex="0"
           onclick={(e) => { e.stopPropagation(); productsDropdownOpen = !productsDropdownOpen; }}
           onkeydown={(e) => { if (e.key === 'Enter') productsDropdownOpen = !productsDropdownOpen; }}>
        <span class="nav-link dropdown-trigger">
          Products
          <ChevronDown size={16} class={productsDropdownOpen ? 'rotate' : ''} />
        </span>
        {#if productsDropdownOpen}
          <div class="dropdown-menu">
            <a href="/" class="dropdown-item active" onclick={() => productsDropdownOpen = false}>
              <span class="dropdown-icon">🛡️</span>
              <div>
                <span class="dropdown-title">Greenwash Check</span>
                <span class="dropdown-desc">AI-powered greenwashing assessment</span>
              </div>
              <span class="active-badge">Active</span>
            </a>
            <div class="dropdown-item disabled">
              <span class="dropdown-icon">📊</span>
              <div>
                <span class="dropdown-title">Muuvment IQ</span>
                <span class="dropdown-desc">ESG intelligence platform</span>
              </div>
              <span class="coming-soon-badge">Coming Soon</span>
            </div>
            <div class="dropdown-item disabled">
              <span class="dropdown-icon">🧠</span>
              <div>
                <span class="dropdown-title">Muuvment Resilience</span>
                <span class="dropdown-desc">Mental resilience for sustainability</span>
              </div>
              <span class="coming-soon-badge">Coming Soon</span>
            </div>
          </div>
        {/if}
      </div>
      
      <a href="/methodology" class="nav-link">Methodology</a>
      <a href="/resources" class="nav-link">Resources</a>
      
      {#if currentUser}
        <a href="/assess" class="nav-link">Assess</a>
        <a href="/history" class="nav-link">History</a>
        <div class="user-menu">
          <User size={18} />
          <span>{currentUser.name}</span>
          <button onclick={() => handleLogout()} class="logout-btn" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      {:else}
        <a href="https://muuvment.com/contact" class="nav-link" target="_blank" rel="noopener">Contact</a>
        <a href="/login" class="btn btn-primary">Get Started</a>
      {/if}
    </nav>
    
    <button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
      {#if mobileMenuOpen}
        <X size={24} />
      {:else}
        <Menu size={24} />
      {/if}
    </button>
  </div>
  
  {#if mobileMenuOpen}
    <nav class="nav-mobile">
      <div class="mobile-section">
        <span class="mobile-section-title">Products</span>
        <a href="/" class="nav-link mobile-product" onclick={() => mobileMenuOpen = false}>
          🛡️ Greenwash Check
          <span class="active-badge-sm">Active</span>
        </a>
        <span class="nav-link mobile-product disabled">
          📊 Muuvment IQ
          <span class="coming-soon-badge-sm">Soon</span>
        </span>
        <span class="nav-link mobile-product disabled">
          🧠 Muuvment Resilience
          <span class="coming-soon-badge-sm">Soon</span>
        </span>
      </div>
      
      <a href="/methodology" class="nav-link" onclick={() => mobileMenuOpen = false}>Methodology</a>
      <a href="/resources" class="nav-link" onclick={() => mobileMenuOpen = false}>Resources</a>
      
      {#if currentUser}
        <a href="/assess" class="nav-link" onclick={() => mobileMenuOpen = false}>Assess</a>
        <a href="/history" class="nav-link" onclick={() => mobileMenuOpen = false}>History</a>
        <button onclick={() => { handleLogout(); mobileMenuOpen = false; }} class="nav-link logout">
          <LogOut size={18} />
          Logout
        </button>
      {:else}
        <a href="https://muuvment.com/contact" class="nav-link" target="_blank" rel="noopener" onclick={() => mobileMenuOpen = false}>Contact</a>
        <a href="/login" class="btn btn-primary" onclick={() => mobileMenuOpen = false}>Get Started</a>
      {/if}
    </nav>
  {/if}
</header>

<style>
  .header {
    background: #FFFFFF;
    border-bottom: 1px solid #E5E7EB;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.875rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }
  
  .logo-text {
    font-weight: 600;
    color: #1a2b4a;
    font-size: 1rem;
    letter-spacing: 0.05em;
  }
  
  .nav-desktop {
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  
  .nav-dropdown {
    position: relative;
  }
  
  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }
  
  .dropdown-trigger :global(svg) {
    transition: transform 0.2s;
  }
  
  .dropdown-trigger :global(svg.rotate) {
    transform: rotate(180deg);
  }
  
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    padding: 0.5rem;
    z-index: 200;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 8px;
    text-decoration: none;
    color: #1a2b4a;
    transition: background 0.2s;
  }
  
  .dropdown-item:hover:not(.disabled) {
    background: #F3F4F6;
  }
  
  .dropdown-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .dropdown-icon {
    font-size: 1.25rem;
  }
  
  .dropdown-title {
    display: block;
    font-weight: 600;
    font-size: 0.9375rem;
  }
  
  .dropdown-desc {
    display: block;
    font-size: 0.8125rem;
    color: #6B7280;
  }
  
  .active-badge {
    margin-left: auto;
    background: #10B981;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .coming-soon-badge {
    margin-left: auto;
    background: #F59E0B;
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .nav-link {
    color: #4B5563;
    font-weight: 500;
    font-size: 0.9375rem;
    text-decoration: none;
    transition: color 0.2s;
    padding: 0.5rem 0;
  }
  
  .nav-link:hover {
    color: #1a2b4a;
  }
  
  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #F3F4F6;
    border-radius: 20px;
    font-size: 0.875rem;
    color: #1a2b4a;
  }
  
  .logout-btn {
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.2s;
    margin-left: 0.25rem;
  }
  
  .logout-btn:hover {
    color: #EF4444;
  }
  
  .mobile-menu-btn {
    display: none;
    background: none;
    border: none;
    color: #1a2b4a;
    cursor: pointer;
    padding: 0.5rem;
  }
  
  .nav-mobile {
    display: none;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid #E5E7EB;
    background: #FFFFFF;
  }
  
  .mobile-section {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #E5E7EB;
    margin-bottom: 0.5rem;
  }
  
  .mobile-section-title {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  
  .mobile-product {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }
  
  .mobile-product.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .active-badge-sm, .coming-soon-badge-sm {
    margin-left: auto;
    padding: 0.15rem 0.4rem;
    border-radius: 20px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .active-badge-sm {
    background: #10B981;
    color: white;
  }
  
  .coming-soon-badge-sm {
    background: #F59E0B;
    color: white;
  }
  
  .nav-mobile .nav-link {
    padding: 0.75rem 0;
    border-bottom: 1px solid #E5E7EB;
  }
  
  .nav-mobile .logout {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #EF4444;
    font-size: 1rem;
    padding: 0.75rem 0;
    font-family: inherit;
  }
  
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border-radius: 8px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: #0D9488;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #0F766E;
  }
  
  @media (max-width: 768px) {
    .nav-desktop {
      display: none;
    }
    
    .mobile-menu-btn {
      display: block;
    }
    
    .nav-mobile {
      display: flex;
    }
  }
</style>
