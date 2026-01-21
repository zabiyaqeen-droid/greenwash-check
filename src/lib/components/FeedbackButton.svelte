<script lang="ts">
  let isExpanded = $state(false);
  
  const feedbackUrl = 'https://pointed-tablecloth-178.notion.site/f66abc3436374869b048f364f4239e5f?pvs=105';
  
  function toggleExpand() {
    isExpanded = !isExpanded;
  }
  
  function openFeedback() {
    window.open(feedbackUrl, '_blank');
  }
</script>

<div class="feedback-container" class:expanded={isExpanded}>
  {#if isExpanded}
    <div class="feedback-panel">
      <button class="close-btn" onclick={toggleExpand}>×</button>
      <div class="feedback-content">
        <h4>Help Us Improve</h4>
        <p>This tool is <strong>100% free</strong> because we believe in protecting the integrity of ESG and sustainability.</p>
        <p>Your feedback helps us make it better for everyone.</p>
        <button class="feedback-submit-btn" onclick={openFeedback}>
          Share Your Feedback
        </button>
      </div>
    </div>
  {/if}
  
  <button class="feedback-trigger" onclick={toggleExpand} title="Share feedback">
    <span class="feedback-icon">💬</span>
    <span class="feedback-label">Feedback</span>
  </button>
</div>

<style>
  .feedback-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .feedback-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #4A428E 0%, #0f766e 100%);
    color: white;
    border: none;
    padding: 12px 18px;
    border-radius: 50px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 15px rgba(13, 148, 136, 0.3);
    transition: all 0.3s ease;
  }
  
  .feedback-trigger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
  }
  
  .feedback-icon {
    font-size: 18px;
  }
  
  .feedback-label {
    display: inline;
  }
  
  .feedback-panel {
    position: absolute;
    bottom: 60px;
    right: 0;
    width: 300px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    padding: 20px;
    animation: slideUp 0.3s ease;
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .close-btn {
    position: absolute;
    top: 10px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }
  
  .close-btn:hover {
    color: #333;
  }
  
  .feedback-content h4 {
    margin: 0 0 12px 0;
    color: #0F172A;
    font-size: 18px;
    font-weight: 600;
  }
  
  .feedback-content p {
    margin: 0 0 12px 0;
    color: #4B5563;
    font-size: 14px;
    line-height: 1.5;
  }
  
  .feedback-content p:last-of-type {
    margin-bottom: 16px;
  }
  
  .feedback-content strong {
    color: #4A428E;
  }
  
  .feedback-submit-btn {
    width: 100%;
    background: linear-gradient(135deg, #4A428E 0%, #0f766e 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .feedback-submit-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
  }
  
  /* Mobile responsive */
  @media (max-width: 480px) {
    .feedback-container {
      bottom: 15px;
      right: 15px;
    }
    
    .feedback-label {
      display: none;
    }
    
    .feedback-trigger {
      padding: 12px;
      border-radius: 50%;
    }
    
    .feedback-panel {
      width: 280px;
      right: -10px;
    }
  }
</style>
