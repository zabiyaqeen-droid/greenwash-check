<script lang="ts">
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { Users, Mail, Building2, Briefcase, Linkedin, Calendar, Shield, AlertCircle, Loader2, Download, RefreshCw, Trash2 } from 'lucide-svelte';
  
  const ADMIN_EMAILS = ['zabi@muuvment.com', 'info@muuvment.com', 'martin@muuvment.com'];
  
  let currentUser = $state<any>(null);
  let isAdmin = $state(false);
  let isLoading = $state(true);
  let users = $state<any[]>([]);
  let emailSubmissions = $state<any[]>([]);
  let error = $state('');
  let sortBy = $state<'date' | 'name' | 'company'>('date');
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let activeTab = $state<'users' | 'emails'>('users');
  
  onMount(async () => {
    user.init();
    user.subscribe(u => {
      currentUser = u;
      if (!u) {
        goto('/login');
        return;
      }
      
      // Check if user is admin
      if (ADMIN_EMAILS.includes(u.email?.toLowerCase())) {
        isAdmin = true;
        loadUsers();
        loadEmailSubmissions();
      } else {
        isAdmin = false;
        isLoading = false;
      }
    });
  });
  
  async function loadUsers() {
    isLoading = true;
    error = '';
    
    try {
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load users');
      }
      
      users = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load users';
    } finally {
      isLoading = false;
    }
  }
  
  function sortUsers(by: 'date' | 'name' | 'company') {
    if (sortBy === by) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = by;
      sortOrder = 'desc';
    }
  }
  
  $effect(() => {
    if (users.length > 0) {
      users = [...users].sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
            break;
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'company':
            comparison = (a.company || '').localeCompare(b.company || '');
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
  });
  
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  async function loadEmailSubmissions() {
    try {
      const response = await fetch('/api/admin/email-submissions', {
        headers: {
          'x-admin-email': currentUser?.email || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        emailSubmissions = data.submissions || [];
      }
    } catch (err) {
      console.error('Error loading email submissions:', err);
    }
  }
  
  async function deleteEmailSubmission(id: string) {
    if (!confirm('Are you sure you want to delete this email submission?')) return;
    
    try {
      const response = await fetch('/api/admin/email-submissions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || ''
        },
        body: JSON.stringify({ id })
      });
      
      if (response.ok) {
        emailSubmissions = emailSubmissions.filter(e => e.id !== id);
      }
    } catch (err) {
      console.error('Error deleting email submission:', err);
    }
  }
  
  function exportEmailsCSV() {
    const headers = ['Email', 'Document Name', 'Score', 'Risk Level', 'Submitted At'];
    const rows = emailSubmissions.map(e => [
      e.email || '',
      e.document_name || '',
      e.assessment_score?.toString() || '',
      e.risk_level || '',
      e.submitted_at || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenwash-check-emails-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
  
  function exportCSV() {
    const headers = ['Name', 'Email', 'Company', 'Job Title', 'LinkedIn', 'Registered At'];
    const rows = users.map(u => [
      u.name || '',
      u.email || '',
      u.company || '',
      u.jobTitle || '',
      u.linkedin || '',
      u.registeredAt || ''
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenwash-check-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Admin Dashboard | Greenwash Check</title>
</svelte:head>

<main class="admin-page">
  <div class="container">
    {#if !isAdmin && !isLoading}
      <div class="access-denied">
        <Shield size={64} strokeWidth={1} />
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <a href="/assess" class="back-btn">Go to Assessment</a>
      </div>
    {:else if isLoading}
      <div class="loading">
        <Loader2 size={48} class="spin" />
        <p>Loading admin dashboard...</p>
      </div>
    {:else}
      <div class="admin-header">
        <div class="admin-title">
          <Shield size={32} />
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage registered users and view analytics</p>
          </div>
        </div>
        <div class="admin-actions">
          <button class="action-btn" onclick={loadUsers}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button class="action-btn primary" onclick={exportCSV}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <Users size={24} />
          </div>
          <div class="stat-content">
            <span class="stat-value">{users.length}</span>
            <span class="stat-label">Total Users</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <Mail size={24} />
          </div>
          <div class="stat-content">
            <span class="stat-value">{emailSubmissions.length}</span>
            <span class="stat-label">Email Submissions</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <Building2 size={24} />
          </div>
          <div class="stat-content">
            <span class="stat-value">{new Set(users.map(u => u.company).filter(Boolean)).size}</span>
            <span class="stat-label">Companies</span>
          </div>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="admin-tabs">
        <button 
          class="tab-btn" 
          class:active={activeTab === 'users'}
          onclick={() => activeTab = 'users'}
        >
          <Users size={18} />
          Registered Users ({users.length})
        </button>
        <button 
          class="tab-btn" 
          class:active={activeTab === 'emails'}
          onclick={() => activeTab = 'emails'}
        >
          <Mail size={18} />
          Email Submissions ({emailSubmissions.length})
        </button>
      </div>
      
      {#if error}
        <div class="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      {/if}
      
      {#if activeTab === 'users'}
      <!-- Users Table -->
      <div class="users-section">
        <div class="section-header">
          <h2>Registered Users</h2>
          <div class="sort-buttons">
            <button 
              class="sort-btn" 
              class:active={sortBy === 'date'}
              onclick={() => sortUsers('date')}
            >
              Date {sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button 
              class="sort-btn" 
              class:active={sortBy === 'name'}
              onclick={() => sortUsers('name')}
            >
              Name {sortBy === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
            <button 
              class="sort-btn" 
              class:active={sortBy === 'company'}
              onclick={() => sortUsers('company')}
            >
              Company {sortBy === 'company' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>
        
        {#if users.length === 0}
          <div class="empty-state">
            <Users size={48} strokeWidth={1} />
            <p>No registered users yet.</p>
          </div>
        {:else}
          <div class="users-table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>LinkedIn</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {#each users as u}
                  <tr>
                    <td class="user-cell">
                      <div class="user-avatar">
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div class="user-info">
                        <span class="user-name">{u.name || 'Unknown'}</span>
                        <span class="user-email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      {#if u.company}
                        <div class="company-cell">
                          <Building2 size={14} />
                          <span>{u.company}</span>
                        </div>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td>
                      {#if u.jobTitle}
                        <div class="job-cell">
                          <Briefcase size={14} />
                          <span>{u.jobTitle}</span>
                        </div>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td>
                      {#if u.linkedin}
                        <a href={u.linkedin} target="_blank" rel="noopener" class="linkedin-link">
                          <Linkedin size={14} />
                          View Profile
                        </a>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td class="date-cell">
                      {formatDate(u.registeredAt)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      {/if}
      
      {#if activeTab === 'emails'}
      <!-- Email Submissions Table -->
      <div class="users-section">
        <div class="section-header">
          <h2>Email Submissions</h2>
          <button class="action-btn primary" onclick={exportEmailsCSV}>
            <Download size={18} />
            Export CSV
          </button>
        </div>
        
        {#if emailSubmissions.length === 0}
          <div class="empty-state">
            <Mail size={48} strokeWidth={1} />
            <p>No email submissions yet.</p>
          </div>
        {:else}
          <div class="users-table-container">
            <table class="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Document</th>
                  <th>Score</th>
                  <th>Risk Level</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each emailSubmissions as submission}
                  <tr>
                    <td class="user-cell">
                      <div class="user-avatar">
                        <Mail size={16} />
                      </div>
                      <div class="user-info">
                        <span class="user-email">{submission.email}</span>
                      </div>
                    </td>
                    <td>
                      {#if submission.document_name}
                        <span>{submission.document_name}</span>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td>
                      {#if submission.assessment_score !== null && submission.assessment_score !== undefined}
                        <span class="score-badge">{submission.assessment_score}/100</span>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td>
                      {#if submission.risk_level}
                        <span class="risk-badge" class:high={submission.risk_level === 'High Risk'} class:medium={submission.risk_level === 'Medium Risk'} class:low={submission.risk_level === 'Low Risk'}>
                          {submission.risk_level}
                        </span>
                      {:else}
                        <span class="empty-value">-</span>
                      {/if}
                    </td>
                    <td class="date-cell">
                      {formatDate(submission.submitted_at)}
                    </td>
                    <td>
                      <button class="delete-btn" onclick={() => deleteEmailSubmission(submission.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
      {/if}
    {/if}
  </div>
</main>

<style>
  .admin-page {
    min-height: 100vh;
    background: #FAFAFA;
    padding: 2rem 0 4rem;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  
  /* Access Denied */
  .access-denied {
    text-align: center;
    padding: 4rem 2rem;
    color: #7F8C8D;
  }
  
  .access-denied h1 {
    color: #2C3E50;
    margin: 1.5rem 0 0.5rem;
  }
  
  .access-denied p {
    margin-bottom: 2rem;
  }
  
  .back-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #6B8E6B;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
  }
  
  /* Loading */
  .loading {
    text-align: center;
    padding: 4rem 2rem;
    color: #7F8C8D;
  }
  
  .loading p {
    margin-top: 1rem;
  }
  
  /* Admin Header */
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .admin-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .admin-title svg {
    color: #6B8E6B;
  }
  
  .admin-title h1 {
    font-size: 1.75rem;
    color: #2C3E50;
    margin: 0;
  }
  
  .admin-title p {
    color: #7F8C8D;
    margin: 0;
  }
  
  .admin-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #5D6D7E;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-btn:hover {
    border-color: #6B8E6B;
    color: #6B8E6B;
  }
  
  .action-btn.primary {
    background: #6B8E6B;
    border-color: #6B8E6B;
    color: white;
  }
  
  .action-btn.primary:hover {
    background: #5A7A5A;
  }
  
  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 12px;
    border: 1px solid #E0E0E0;
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    background: #F0FDF4;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6B8E6B;
  }
  
  .stat-content {
    display: flex;
    flex-direction: column;
  }
  
  .stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2C3E50;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #7F8C8D;
  }
  
  /* Error Message */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #FEE2E2;
    border: 1px solid #FECACA;
    border-radius: 8px;
    color: #DC2626;
    margin-bottom: 2rem;
  }
  
  /* Users Section */
  .users-section {
    background: white;
    border-radius: 12px;
    border: 1px solid #E0E0E0;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #E0E0E0;
    background: #F8F9FA;
  }
  
  .section-header h2 {
    font-size: 1.125rem;
    color: #2C3E50;
    margin: 0;
  }
  
  .sort-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .sort-btn {
    padding: 0.375rem 0.75rem;
    background: white;
    border: 1px solid #E0E0E0;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #7F8C8D;
    cursor: pointer;
  }
  
  .sort-btn.active {
    background: #6B8E6B;
    border-color: #6B8E6B;
    color: white;
  }
  
  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #7F8C8D;
  }
  
  .empty-state p {
    margin-top: 1rem;
  }
  
  /* Users Table */
  .users-table-container {
    overflow-x: auto;
  }
  
  .users-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .users-table th {
    text-align: left;
    padding: 1rem 1.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #7F8C8D;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #E0E0E0;
  }
  
  .users-table td {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #F0F0F0;
    font-size: 0.9375rem;
    color: #5D6D7E;
  }
  
  .users-table tr:last-child td {
    border-bottom: none;
  }
  
  .users-table tr:hover {
    background: #FAFAFA;
  }
  
  .user-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    background: #6B8E6B;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
  }
  
  .user-name {
    font-weight: 600;
    color: #2C3E50;
  }
  
  .user-email {
    font-size: 0.8125rem;
    color: #7F8C8D;
  }
  
  .company-cell,
  .job-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .company-cell svg,
  .job-cell svg {
    color: #7F8C8D;
  }
  
  .linkedin-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #0077B5;
    text-decoration: none;
    font-size: 0.875rem;
  }
  
  .linkedin-link:hover {
    text-decoration: underline;
  }
  
  .date-cell {
    font-size: 0.8125rem;
    color: #7F8C8D;
  }
  
  .empty-value {
    color: #BDC3C7;
  }
  
  /* Spinner */
  :global(.spin) {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .admin-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .users-table th,
    .users-table td {
      padding: 0.75rem 1rem;
    }
  }
  
  /* Tabs */
  .admin-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 0;
  }
  
  .tab-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    color: #7F8C8D;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .tab-btn:hover {
    color: #2C3E50;
  }
  
  .tab-btn.active {
    color: #6B8E6B;
    border-bottom-color: #6B8E6B;
  }
  
  /* Score and Risk Badges */
  .score-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #E8F5E9;
    color: #2E7D32;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
  }
  
  .risk-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 500;
    font-size: 0.85rem;
  }
  
  .risk-badge.high {
    background: #FFEBEE;
    color: #C62828;
  }
  
  .risk-badge.medium {
    background: #FFF3E0;
    color: #E65100;
  }
  
  .risk-badge.low {
    background: #E8F5E9;
    color: #2E7D32;
  }
  
  /* Delete Button */
  .delete-btn {
    padding: 0.35rem 0.75rem;
    background: #FFEBEE;
    color: #C62828;
    border: 1px solid #FFCDD2;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .delete-btn:hover {
    background: #FFCDD2;
  }
</style>
