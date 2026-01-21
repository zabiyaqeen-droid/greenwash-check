<script lang="ts">
  import { Mail, Phone, Linkedin, Instagram, Facebook } from 'lucide-svelte';
</script>

<footer class="footer">
  <!-- AI2030 Catalyst Program Section -->
  <div class="ai2030-section">
    <div class="ai2030-content">
      <div class="ai2030-logo">
        <img src="/ai2030-logo.png" alt="AI2030 - Responsible Artificial Intelligence" class="ai2030-logo-img" />
      </div>
      <p class="ai2030-description">
        <strong>Muuvment is an alumni of the <a href="https://ai2030.org/" target="_blank" rel="noopener">AI2030 Catalyst Program</a> for Responsible AI.</strong> Muuvment was invited to participate in the programme because of its innovation and leadership in advancing responsible AI.
      </p>
    </div>
  </div>
  
  <!-- UN Global Compact Section -->
  <div class="un-compact-section">
    <div class="un-compact-content">
      <div class="un-logo">
        <img src="/un-global-compact-logo.png" alt="United Nations Global Compact - 25 Years" class="un-logo-img" />
      </div>
      <p class="un-description">
        <strong>Muuvment is committed to the UN Global Compact corporate responsibility initiative</strong> and its principles in the areas of human rights, labour, environment, and anti-corruption.
      </p>
    </div>
  </div>
  
  <!-- Main Footer -->
  <div class="footer-main">
    <div class="footer-content">
      <!-- Brand Column -->
      <div class="footer-brand">
        <a href="https://muuvment.com" target="_blank" rel="noopener" class="logo">
          <img src="/muuvment-logo-white.webp" alt="Muuvment" class="logo-img" />
        </a>
        <div class="contact-info">
          <a href="mailto:info@muuvment.com" class="contact-link">
            <Mail size={16} />
            info@muuvment.com
          </a>
          <a href="tel:+18666452040" class="contact-link">
            <Phone size={16} />
            +1 866 645 2040
          </a>
        </div>
      </div>
      
      <!-- Solutions Column -->
      <div class="footer-column">
        <h4>Solutions</h4>
        <a href="https://app.muuvment.com/ai/assistant" target="_blank" rel="noopener">Muuvment IQ</a>
        <a href="https://muuvment.com/purpose" target="_blank" rel="noopener">Muuvment Purpose</a>
        <a href="https://muuvment.com/lens" target="_blank" rel="noopener">LENS</a>
        <a href="https://muuvment.com/labs" target="_blank" rel="noopener">Muuvment Labs</a>
      </div>
      
      <!-- Company Column -->
      <div class="footer-column">
        <h4>Company</h4>
        <a href="https://muuvment.com/about" target="_blank" rel="noopener">About Muuvment</a>
        <a href="https://muuvment.com/contact" target="_blank" rel="noopener">Contact</a>
        <a href="https://muuvment.com/resources" target="_blank" rel="noopener">Resources</a>
        <a href="https://muuvment.com/faq" target="_blank" rel="noopener">FAQ's</a>
      </div>
      
      <!-- Legal Column -->
      <div class="footer-column">
        <h4>Legal</h4>
        <a href="https://muuvment.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>
        <a href="https://muuvment.com/terms" target="_blank" rel="noopener">Terms & Conditions</a>
      </div>
      
      <!-- Social & Copyright -->
      <div class="footer-social">
        <div class="social-links">
          <a href="https://www.linkedin.com/company/muuvment/" target="_blank" rel="noopener" aria-label="LinkedIn">
            <Linkedin size={18} />
          </a>
          <a href="https://twitter.com/muuvment" target="_blank" rel="noopener" aria-label="X (Twitter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://instagram.com/muuvment" target="_blank" rel="noopener" aria-label="Instagram">
            <Instagram size={18} />
          </a>
          <a href="https://facebook.com/muuvment" target="_blank" rel="noopener" aria-label="Facebook">
            <Facebook size={18} />
          </a>
        </div>
        <p class="copyright">© 2026 Muuvment</p>
        <a href="#" class="cookie-preferences">Cookie Preferences</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .footer {
    margin-top: auto;
  }
  
  /* AI2030 Catalyst Program Section */
  .ai2030-section {
    background: #F5F3FF;
    padding: 2rem 1.5rem;
  }
  
  .ai2030-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  
  .ai2030-logo {
    flex-shrink: 0;
  }
  
  .ai2030-logo-img {
    height: 50px;
    width: auto;
  }
  
  .ai2030-description {
    flex: 1;
    margin: 0;
    color: #4C1D95;
    font-size: 0.95rem;
    line-height: 1.6;
    min-width: 300px;
  }
  
  .ai2030-description strong {
    color: #5B21B6;
  }
  
  .ai2030-description a {
    color: #7C3AED;
    text-decoration: underline;
  }
  
  .ai2030-description a:hover {
    color: #5B21B6;
  }
  
  /* UN Global Compact Section */
  .un-compact-section {
    background: #1E3A5F;
    padding: 2rem 1.5rem;
  }
  
  .un-compact-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 2rem;
    flex-wrap: wrap;
  }
  
  .un-logo {
    flex-shrink: 0;
  }
  
  .un-logo-img {
    height: 60px;
    width: auto;
  }
  
  .un-description {
    flex: 1;
    margin: 0;
    color: #E2E8F0;
    font-size: 0.95rem;
    line-height: 1.6;
    min-width: 300px;
  }
  
  .un-description strong {
    color: #FFFFFF;
  }
  
  /* Main Footer */
  .footer-main {
    background: #0F172A;
    padding: 3rem 1.5rem 2rem;
  }
  
  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
    gap: 2rem;
  }
  
  /* Brand Column */
  .footer-brand {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .logo {
    display: inline-block;
  }
  
  .logo-img {
    height: 28px;
    width: auto;
  }
  
  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .contact-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #E2E8F0;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  
  .contact-link:hover {
    color: #4A428E;
  }
  
  /* Footer Columns */
  .footer-column h4 {
    margin: 0 0 1.25rem;
    color: #FFFFFF;
    font-size: 0.95rem;
    font-weight: 600;
  }
  
  .footer-column a {
    display: block;
    color: #94A3B8;
    text-decoration: none;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
    transition: color 0.2s;
  }
  
  .footer-column a:hover {
    color: #4A428E;
  }
  
  /* Social & Copyright */
  .footer-social {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1rem;
  }
  
  .social-links {
    display: flex;
    gap: 0.5rem;
  }
  
  .social-links a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #334155;
    color: #94A3B8;
    transition: all 0.2s;
  }
  
  .social-links a:hover {
    border-color: #4A428E;
    color: #4A428E;
  }
  
  .copyright {
    margin: 0;
    color: #64748B;
    font-size: 0.85rem;
  }
  
  .cookie-preferences {
    color: #64748B;
    text-decoration: none;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s;
  }
  
  .cookie-preferences:hover {
    color: #4A428E;
  }
  
  /* Responsive */
  @media (max-width: 1024px) {
    .footer-content {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .footer-brand {
      grid-column: span 3;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #1E293B;
      margin-bottom: 1rem;
    }
    
    .footer-social {
      grid-column: span 3;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-top: 1.5rem;
      border-top: 1px solid #1E293B;
      margin-top: 1rem;
    }
  }
  
  @media (max-width: 768px) {
    .ai2030-content {
      flex-direction: column;
      text-align: center;
    }
    
    .ai2030-description {
      min-width: auto;
    }
    
    .un-compact-content {
      flex-direction: column;
      text-align: center;
    }
    
    .un-description {
      min-width: auto;
    }
    
    .un-description {
      min-width: auto;
    }
    
    .footer-content {
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    
    .footer-brand {
      grid-column: span 2;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .footer-social {
      grid-column: span 2;
      flex-direction: column;
      align-items: center;
    }
  }
  
  @media (max-width: 480px) {
    .footer-content {
      grid-template-columns: 1fr;
    }
    
    .footer-brand,
    .footer-social {
      grid-column: span 1;
    }
  }
</style>
