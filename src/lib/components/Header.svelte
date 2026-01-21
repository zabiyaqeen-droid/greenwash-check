<script lang="ts">
  import { user } from '$lib/stores/user';
  import { LogOut, User, Menu, X, Shield } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  
  let mobileMenuOpen = $state(false);
  let currentUser = $state<any>(null);
  
  // Admin emails list
  const ADMIN_EMAILS = ['zabi@muuvment.com'];
  
  $effect(() => {
    user.subscribe(u => {
      currentUser = u;
    });
  });
  
  function handleLogout() {
    user.logout();
    goto('/login');
  }
  
  function isAdmin(): boolean {
    return currentUser?.email && ADMIN_EMAILS.includes(currentUser.email.toLowerCase());
  }
</script>

<header class="header">
  <div class="header-content">
    <a href="/" class="logo">
        <img src="/muuvment-logo-header.png" alt="Muuvment" class="logo-img" />
        <span class="logo-text">Greenwash Check</span>
      </a>
    
    <nav class="nav-desktop">
      <a href="/assess" class="nav-link">Assess</a>
      <a href="/methodology" class="nav-link">Methodology</a>
      <a href="/resources" class="nav-link">Resources</a>
      
      {#if currentUser}
        <a href="/history" class="nav-link">History</a>
        {#if isAdmin()}
          <a href="/admin" class="nav-link admin-link">
            <Shield size={16} />
            Admin
          </a>
        {/if}
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
      <a href="/assess" class="nav-link" onclick={() => mobileMenuOpen = false}>Assess</a>
      <a href="/methodology" class="nav-link" onclick={() => mobileMenuOpen = false}>Methodology</a>
      <a href="/resources" class="nav-link" onclick={() => mobileMenuOpen = false}>Resources</a>
      
      {#if currentUser}
        <a href="/history" class="nav-link" onclick={() => mobileMenuOpen = false}>History</a>
        {#if isAdmin()}
          <a href="/admin" class="nav-link admin-link" onclick={() => mobileMenuOpen = false}>
            <Shield size={16} />
            Admin
          </a>
        {/if}
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
    text-decoration: none;
  }
  
  .logo-img {
    height: 32px;
    width: auto;
  }
  
  .nav-desktop {
    display: flex;
    align-items: center;
    gap: 2rem;
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
  
  .admin-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #0D9488;
  }
  
  .admin-link:hover {
    color: #0F766E;
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
  
  .nav-mobile .nav-link {
    padding: 0.75rem 0;
    border-bottom: 1px solid #E5E7EB;
  }
  
  .nav-mobile .admin-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
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
