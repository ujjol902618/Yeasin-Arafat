import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './firebase-config.js';
import {
  DEFAULT_PROFILE,
  DEFAULT_ABOUT,
  DEFAULT_STATISTICS,
  DEFAULT_SKILLS,
  DEFAULT_SERVICES,
  DEFAULT_PROJECTS,
  DEFAULT_EXPERIENCES,
  DEFAULT_EDUCATION,
  DEFAULT_CERTIFICATIONS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_CLIENTS,
  DEFAULT_SOCIAL_LINKS,
  DEFAULT_SETTINGS,
} from './seed-data.js';
import { sendMessage } from './messages.js';

// Global state
let currentProjects = [];
let activeProjectCategory = 'all';

// PWA Install Prompt State
let deferredPWAInstallPrompt = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initPWAInstall();
  initMobileNav();
  initSmoothScroll();
  initContactForm();
  loadAllPortfolioData();
});

// Register PWA Service Worker
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration error:', err);
        });
    });
  }
}

// In-App PWA Install Prompt Hook
function initPWAInstall() {
  const installBtn = document.getElementById('pwaInstallBtn');
  const installNavBtn = document.getElementById('pwaNavInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPWAInstallPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
    if (installNavBtn) installNavBtn.style.display = 'inline-flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredPWAInstallPrompt = null;
    if (installBtn) installBtn.style.display = 'none';
    if (installNavBtn) installNavBtn.style.display = 'none';
    showToast('Portfolio app installed successfully!', 'success');
  });

  const triggerInstall = async () => {
    if (!deferredPWAInstallPrompt) {
      // Check if iOS
      const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIOS) {
        alert('To install on iOS: Tap Share in Safari toolbar, then tap "Add to Home Screen".');
      } else {
        showToast('App is already installed or ready in browser menu.', 'info');
      }
      return;
    }
    deferredPWAInstallPrompt.prompt();
    const choice = await deferredPWAInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPWAInstallPrompt = null;
      if (installBtn) installBtn.style.display = 'none';
      if (installNavBtn) installNavBtn.style.display = 'none';
    }
  };

  if (installBtn) installBtn.addEventListener('click', triggerInstall);
  if (installNavBtn) installNavBtn.addEventListener('click', triggerInstall);
}

// Mobile Navigation
function initMobileNav() {
  const burger = document.getElementById('burgerBtn');
  const mobileNav = document.getElementById('mobileNav');
  if (!burger || !mobileNav) return;

  burger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });

  const links = mobileNav.querySelectorAll('a');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
    });
  });
}

// Smooth scrolling and active section observer
function initSmoothScroll() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach((current) => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
}

// Load dynamic data from Firestore (falling back gracefully to seed data)
async function loadAllPortfolioData() {
  try {
    await Promise.all([
      loadProfile(),
      loadAbout(),
      loadStatistics(),
      loadSkills(),
      loadServices(),
      loadProjects(),
      loadExperience(),
      loadEducation(),
      loadCertifications(),
      loadTestimonials(),
      loadClients(),
      loadSocialLinks(),
      loadSettings(),
    ]);
  } catch (err) {
    console.error('Error loading portfolio data:', err);
  }
}

// 1. Profile / Hero Section
async function loadProfile() {
  let profile = DEFAULT_PROFILE;
  try {
    const snap = await getDoc(doc(db, 'profile', 'general'));
    if (snap.exists()) {
      profile = { ...DEFAULT_PROFILE, ...snap.data() };
    }
  } catch (e) {
    console.warn('Using default profile data:', e);
  }

  // Bind to DOM
  setText('heroName', profile.name);
  setText('heroTitle', profile.title);
  setText('heroDesc', profile.shortBio);
  setText('heroAvailability', profile.availability || 'Available for Freelance & Full-time Roles');
  
  const imgEl = document.getElementById('heroAvatar');
  if (imgEl) {
    imgEl.src = profile.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80';
    imgEl.alt = profile.name || 'Yeasin Arafat';
  }

  setText('contactEmailVal', profile.email);
  setText('contactPhoneVal', profile.phone);
  setText('contactLocationVal', profile.location);
}

// 2. About Section
async function loadAbout() {
  let about = DEFAULT_ABOUT;
  try {
    const snap = await getDoc(doc(db, 'about', 'general'));
    if (snap.exists()) {
      about = { ...DEFAULT_ABOUT, ...snap.data() };
    }
  } catch (e) {
    console.warn('Using default about data:', e);
  }

  const contentEl = document.getElementById('aboutContentText');
  if (contentEl) {
    contentEl.textContent = about.content;
  }
  setText('aboutSubheading', about.subheading);

  const cvBtn = document.getElementById('aboutCvBtn');
  if (cvBtn && about.cvUrl) {
    cvBtn.href = about.cvUrl;
  }
}

// 3. Statistics Section
async function loadStatistics() {
  let stats = DEFAULT_STATISTICS;
  try {
    const q = query(collection(db, 'statistics'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      stats = [];
      snap.forEach((d) => stats.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default stats:', e);
  }

  const container = document.getElementById('statisticsGrid');
  if (!container) return;

  container.innerHTML = stats
    .map(
      (s) => `
    <div class="glass-card stat-card" id="${s.id}">
      <div class="stat-value text-gradient">${escapeHtml(s.value)}</div>
      <div class="stat-label">${escapeHtml(s.label)}</div>
    </div>
  `
    )
    .join('');
}

// 4. Skills Section
async function loadSkills() {
  let skills = DEFAULT_SKILLS;
  try {
    const q = query(collection(db, 'skills'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      skills = [];
      snap.forEach((d) => skills.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default skills:', e);
  }

  const enabledSkills = skills.filter((s) => s.enabled !== false);
  renderSkills(enabledSkills);
  setupSkillsFilter(enabledSkills);
}

function renderSkills(skillsList) {
  const container = document.getElementById('skillsGrid');
  if (!container) return;

  container.innerHTML = skillsList
    .map(
      (s) => `
    <div class="glass-card skill-card" id="${s.id}">
      <div class="skill-header">
        <span class="skill-name">${escapeHtml(s.name)}</span>
        <span class="skill-pct">${s.level || 85}%</span>
      </div>
      <div class="skill-bar-bg">
        <div class="skill-bar-fill" style="width: ${s.level || 85}%"></div>
      </div>
    </div>
  `
    )
    .join('');
}

function setupSkillsFilter(allSkills) {
  const filterBtns = document.querySelectorAll('.skills-tab-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-cat');
      if (cat === 'all') {
        renderSkills(allSkills);
      } else {
        const filtered = allSkills.filter((s) => (s.category || '').toLowerCase() === cat.toLowerCase());
        renderSkills(filtered);
      }
    });
  });
}

// 5. Services Section
async function loadServices() {
  let services = DEFAULT_SERVICES;
  try {
    const q = query(collection(db, 'services'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      services = [];
      snap.forEach((d) => services.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default services:', e);
  }

  const enabled = services.filter((s) => s.enabled !== false);
  const container = document.getElementById('servicesGrid');
  if (!container) return;

  const getIconSvg = (name) => {
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>`;
  };

  container.innerHTML = enabled
    .map(
      (serv) => `
    <div class="glass-card service-card" id="${serv.id}">
      <div class="service-icon-box">
        ${getIconSvg(serv.icon)}
      </div>
      <h3 class="service-title">${escapeHtml(serv.title)}</h3>
      <p class="service-desc">${escapeHtml(serv.description)}</p>
    </div>
  `
    )
    .join('');
}

// 6. Projects Section
async function loadProjects() {
  let projects = DEFAULT_PROJECTS;
  try {
    const q = query(collection(db, 'projects'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      projects = [];
      snap.forEach((d) => projects.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default projects:', e);
  }

  currentProjects = projects.filter((p) => p.published !== false);
  renderProjects(currentProjects);
  setupProjectsFilter();
}

function renderProjects(projectsList) {
  const container = document.getElementById('projectsGrid');
  if (!container) return;

  if (projectsList.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
        No projects available in this category.
      </div>
    `;
    return;
  }

  container.innerHTML = projectsList
    .map((p) => {
      const techs = (p.technologies || []).map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('');
      const featBadge = p.featured ? `<span class="project-badge-feat">Featured</span>` : '';
      const thumb = p.thumbnail || 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&auto=format&fit=crop&q=80';

      return `
      <div class="glass-card project-card" id="${p.id}">
        <div class="project-thumb-box">
          <img src="${thumb}" alt="${escapeHtml(p.title)}" class="project-thumb-img" loading="lazy" />
          ${featBadge}
          <span class="project-category-tag">${escapeHtml(p.category || 'Web App')}</span>
        </div>
        <div class="project-body">
          <h3 class="project-title">${escapeHtml(p.title)}</h3>
          <p class="project-desc">${escapeHtml(p.description)}</p>
          <div class="project-techs">${techs}</div>
          <div class="project-links">
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" rel="noreferrer" class="btn btn-primary btn-sm">Live Demo</a>` : ''}
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noreferrer" class="btn btn-secondary btn-sm">GitHub</a>` : ''}
            <button class="btn btn-outline-cyan btn-sm view-gallery-btn" data-project-id="${p.id}" style="margin-left: auto;">
              Gallery
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  // Attach gallery modal handlers
  const galleryBtns = container.querySelectorAll('.view-gallery-btn');
  galleryBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pId = btn.getAttribute('data-project-id');
      const proj = currentProjects.find((x) => x.id === pId);
      if (proj) openProjectModal(proj);
    });
  });
}

function setupProjectsFilter() {
  const filterBtns = document.querySelectorAll('.project-filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-filter');
      activeProjectCategory = cat;
      if (cat === 'all') {
        renderProjects(currentProjects);
      } else {
        const filtered = currentProjects.filter(
          (p) => (p.category || '').toLowerCase() === cat.toLowerCase()
        );
        renderProjects(filtered);
      }
    });
  });
}

// Project Modal / Gallery Lightbox
function openProjectModal(proj) {
  const modal = document.getElementById('projectModal');
  if (!modal) return;

  const images = (proj.images && proj.images.length > 0) ? proj.images : [proj.thumbnail];
  const imagesHtml = images
    .filter(Boolean)
    .map(
      (img) => `
      <div style="margin-bottom: 1.5rem; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <img src="${img}" alt="${escapeHtml(proj.title)}" style="width: 100%; display: block;" loading="lazy" />
      </div>
    `
    )
    .join('');

  const modalBody = document.getElementById('projectModalBody');
  if (modalBody) {
    modalBody.innerHTML = `
      <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem;">${escapeHtml(proj.title)}</h2>
      <div style="color: var(--accent-cyan); font-size: 0.9rem; font-weight: 600; margin-bottom: 1.25rem;">
        Category: ${escapeHtml(proj.category || 'General')}
      </div>
      <p style="color: var(--text-secondary); line-height: 1.7; margin-bottom: 1.5rem;">
        ${escapeHtml(proj.description)}
      </p>
      <div style="display: flex; gap: 0.75rem; margin-bottom: 2rem;">
        ${proj.liveUrl ? `<a href="${proj.liveUrl}" target="_blank" rel="noreferrer" class="btn btn-primary">Visit Live Site</a>` : ''}
        ${proj.githubUrl ? `<a href="${proj.githubUrl}" target="_blank" rel="noreferrer" class="btn btn-secondary">Source Code</a>` : ''}
      </div>
      <h4 style="font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
        Project Screenshots & Gallery
      </h4>
      <div>${imagesHtml}</div>
    `;
  }

  modal.classList.add('open');
}

// Close Modal hook
window.closeProjectModal = function () {
  const modal = document.getElementById('projectModal');
  if (modal) modal.classList.remove('open');
};

// 7. Experience Section
async function loadExperience() {
  let list = DEFAULT_EXPERIENCES;
  try {
    const q = query(collection(db, 'experiences'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default experiences:', e);
  }

  const container = document.getElementById('experienceTimeline');
  if (!container) return;

  container.innerHTML = list
    .map(
      (exp) => `
    <div class="timeline-item" id="${exp.id}">
      <div class="timeline-dot"></div>
      <span class="timeline-date">${escapeHtml(exp.startDate)} — ${escapeHtml(exp.endDate || 'Present')}</span>
      <h3 class="timeline-title">${escapeHtml(exp.jobTitle)}</h3>
      <div class="timeline-subtitle">${escapeHtml(exp.company)} • ${escapeHtml(exp.location || 'Bangladesh')}</div>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${escapeHtml(exp.description)}</p>
    </div>
  `
    )
    .join('');
}

// 8. Education Section
async function loadEducation() {
  let list = DEFAULT_EDUCATION;
  try {
    const q = query(collection(db, 'education'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default education:', e);
  }

  const container = document.getElementById('educationTimeline');
  if (!container) return;

  container.innerHTML = list
    .map(
      (edu) => `
    <div class="timeline-item" id="${edu.id}">
      <div class="timeline-dot"></div>
      <span class="timeline-date">${escapeHtml(edu.startYear)} — ${escapeHtml(edu.endYear)}</span>
      <h3 class="timeline-title">${escapeHtml(edu.degree)}</h3>
      <div class="timeline-subtitle">${escapeHtml(edu.field)} • ${escapeHtml(edu.institution)}</div>
      <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${escapeHtml(edu.description || '')}</p>
    </div>
  `
    )
    .join('');
}

// 9. Certifications Section
async function loadCertifications() {
  let list = DEFAULT_CERTIFICATIONS;
  try {
    const q = query(collection(db, 'certifications'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default certs:', e);
  }

  const container = document.getElementById('certificationsGrid');
  if (!container) return;

  container.innerHTML = list
    .map(
      (cert) => `
    <div class="glass-card cert-card" id="${cert.id}">
      <div class="cert-meta">
        <span>${escapeHtml(cert.organization)}</span>
        <span>${escapeHtml(cert.issueDate)}</span>
      </div>
      <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${escapeHtml(cert.title)}</h3>
      ${cert.credentialId ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">ID: ${escapeHtml(cert.credentialId)}</div>` : ''}
      ${cert.credentialUrl ? `<a href="${cert.credentialUrl}" target="_blank" rel="noreferrer" class="btn btn-outline-cyan btn-sm" style="margin-top: auto;">Verify Credential</a>` : ''}
    </div>
  `
    )
    .join('');
}

// 10. Testimonials Section
async function loadTestimonials() {
  let list = DEFAULT_TESTIMONIALS;
  try {
    const q = query(collection(db, 'testimonials'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default testimonials:', e);
  }

  const enabled = list.filter((t) => t.enabled !== false);
  const container = document.getElementById('testimonialsGrid');
  if (!container) return;

  container.innerHTML = enabled
    .map(
      (t) => `
    <div class="glass-card testimonial-card" id="${t.id}">
      <div style="color: #f59e0b; margin-bottom: 0.75rem;">★★★★★</div>
      <p class="testimonial-quote">"${escapeHtml(t.testimonial)}"</p>
      <div class="testimonial-client">
        <img src="${t.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}" alt="${escapeHtml(t.clientName)}" class="client-photo" loading="lazy" />
        <div class="client-info">
          <h4>${escapeHtml(t.clientName)}</h4>
          <p>${escapeHtml(t.company)}</p>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// 11. Clients Section (Trusted By)
async function loadClients() {
  let list = DEFAULT_CLIENTS;
  try {
    const q = query(collection(db, 'clients'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default clients:', e);
  }

  const enabled = list.filter((c) => c.enabled !== false);
  const container = document.getElementById('clientsGrid');
  if (!container) return;

  container.innerHTML = enabled
    .map(
      (client) => `
    <div class="client-badge" id="${client.id}">
      ${escapeHtml(client.name)}
    </div>
  `
    )
    .join('');
}

// 12. Social Links
async function loadSocialLinks() {
  let list = DEFAULT_SOCIAL_LINKS;
  try {
    const q = query(collection(db, 'socialLinks'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn('Using default social links:', e);
  }

  const enabled = list.filter((s) => s.enabled !== false);
  const heroSocial = document.getElementById('heroSocialLinks');
  const footerSocial = document.getElementById('footerSocialLinks');

  const linksHtml = enabled
    .map(
      (soc) => `
    <a href="${soc.url}" target="_blank" rel="noreferrer" class="social-icon-btn" title="${escapeHtml(soc.platform)}" aria-label="${escapeHtml(soc.platform)}">
      ${getSocialIconSvg(soc.platform)}
    </a>
  `
    )
    .join('');

  if (heroSocial) heroSocial.innerHTML = linksHtml;
  if (footerSocial) footerSocial.innerHTML = linksHtml;
}

// 13. Settings & Footer
async function loadSettings() {
  let settings = DEFAULT_SETTINGS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists()) {
      settings = { ...DEFAULT_SETTINGS, ...snap.data() };
    }
  } catch (e) {
    console.warn('Using default settings:', e);
  }

  setText('siteBrandName', settings.siteName || 'Yeasin Arafat');
  setText('footerBrandName', settings.siteName || 'Yeasin Arafat');
  setText('footerDescText', settings.footerText || DEFAULT_SETTINGS.footerText);
  setText('footerCopyright', settings.copyright || DEFAULT_SETTINGS.copyright);
}

// 14. Contact Form Submission (Saves directly to Cloud Firestore)
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('contactSubmitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName')?.value || '';
    const email = document.getElementById('contactEmail')?.value || '';
    const phone = document.getElementById('contactPhone')?.value || '';
    const subject = document.getElementById('contactSubject')?.value || '';
    const message = document.getElementById('contactMessage')?.value || '';

    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Please fill in your name, email, and message.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Message...';
    }

    try {
      const res = await sendMessage({ name, email, phone, subject, message });
      if (res.success) {
        showToast('Thank you! Your message has been sent to Yeasin.', 'success');
        form.reset();
      } else {
        showToast('Failed to send message: ' + (res.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Error sending message. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    }
  });
}

// Helpers
function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getSocialIconSvg(platform = '') {
  const p = platform.toLowerCase();
  if (p.includes('github')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`;
  }
  if (p.includes('linkedin')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`;
  }
  if (p.includes('whatsapp')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>`;
  }
  if (p.includes('twitter') || p.includes('x')) {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`;
  }
  // Default globe
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
}
