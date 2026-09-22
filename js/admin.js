import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase-config.js';
import { checkAdminAccess, logoutUser } from './firebase-auth.js';
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
import { fetchProjects, saveProject, removeProject, uploadProjectFile } from './projects.js';
import { fetchSkills, saveSkill, removeSkill } from './skills.js';
import { fetchServices, saveService, removeService } from './services.js';
import {
  fetchMessages,
  subscribeToMessages,
  setMessageReadStatus,
  removeMessage,
} from './messages.js';
import { fetchMediaItems, uploadMediaFile, removeMediaItem, formatBytes } from './media.js';
import { compressImageToDataUrl } from './image-utils.js';

let currentUser = null;
let currentView = 'dashboard';
let messagesUnsubscribe = null;
let cachedMessages = [];
let cachedProjects = [];
let cachedSkills = [];
let cachedServices = [];
let cachedMedia = [];

// Initialize Admin
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initAuthProtection();
  initSidebarAndBottomNav();
  initSeedButton();
});

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('[Admin] ServiceWorker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Admin] ServiceWorker registration error:', err);
        });
    });
  }
}

function initAuthProtection() {
  checkAdminAccess(
    (user) => {
      currentUser = user;
      const userEmailEl = document.getElementById('adminUserEmail');
      if (userEmailEl) userEmailEl.textContent = user.email || 'Admin';

      // Load initial view
      switchView('dashboard');
      initMessageNotifications();
    },
    () => {
      // Not logged in -> redirect to login page
      window.location.href = '/login.html';
    }
  );

  // Logout button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to sign out?')) {
        await logoutUser();
        window.location.href = '/login.html';
      }
    });
  }
}

// Sidebar & Bottom Navigation
function initSidebarAndBottomNav() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('menuToggleBtn');

  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Sidebar navigation links
  const navItems = document.querySelectorAll('[data-view]');
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    });
  });
}

// Switch Active View
export async function switchView(viewName) {
  currentView = viewName;

  // Update nav active states
  document.querySelectorAll('[data-view]').forEach((el) => {
    if (el.getAttribute('data-view') === viewName) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  const titleEl = document.getElementById('headerViewTitle');
  const container = document.getElementById('adminViewContainer');
  if (!container) return;

  const titleMap = {
    dashboard: 'Admin Dashboard',
    profile: 'Profile Management',
    about: 'About Content',
    statistics: 'Statistics Milestones',
    skills: 'Skills & Proficiencies',
    services: 'Services Management',
    projects: 'Projects Portfolio',
    experience: 'Work Experience',
    education: 'Education Details',
    certifications: 'Certificates & Credentials',
    testimonials: 'Client Testimonials',
    clients: 'Trusted Clients',
    messages: 'Contact Messages & Inquiries',
    media: 'Media Library & Storage',
    socialLinks: 'Social Media Links',
    settings: 'Website Global Settings',
    setupGuide: 'Firebase & PWA Setup Guide',
  };

  if (titleEl) {
    titleEl.textContent = titleMap[viewName] || 'Admin Panel';
  }

  container.innerHTML = `
    <div style="text-align: center; padding: 4rem 1rem; color: #94a3b8;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem; animation: pulse 1s infinite;">⚡</div>
      <p>Loading ${titleMap[viewName] || ''}...</p>
    </div>
  `;

  // Render respective module
  switch (viewName) {
    case 'dashboard':
      await renderDashboard(container);
      break;
    case 'profile':
      await renderProfileEditor(container);
      break;
    case 'about':
      await renderAboutEditor(container);
      break;
    case 'statistics':
      await renderStatisticsManager(container);
      break;
    case 'skills':
      await renderSkillsManager(container);
      break;
    case 'services':
      await renderServicesManager(container);
      break;
    case 'projects':
      await renderProjectsManager(container);
      break;
    case 'experience':
      await renderExperienceManager(container);
      break;
    case 'education':
      await renderEducationManager(container);
      break;
    case 'certifications':
      await renderCertificationsManager(container);
      break;
    case 'testimonials':
      await renderTestimonialsManager(container);
      break;
    case 'clients':
      await renderClientsManager(container);
      break;
    case 'messages':
      await renderMessagesManager(container);
      break;
    case 'media':
      await renderMediaManager(container);
      break;
    case 'socialLinks':
      await renderSocialLinksManager(container);
      break;
    case 'settings':
      await renderSettingsEditor(container);
      break;
    case 'setupGuide':
      renderSetupGuide(container);
      break;
    default:
      await renderDashboard(container);
  }
}

// 1. Dashboard Module
async function renderDashboard(container) {
  try {
    const [projects, skills, services, testimonials, messages, media] = await Promise.all([
      fetchProjects(),
      fetchSkills(),
      fetchServices(),
      getDocs(collection(db, 'testimonials')).then((s) => s.size).catch(() => DEFAULT_TESTIMONIALS.length),
      fetchMessages(),
      fetchMediaItems(),
    ]);

    cachedProjects = projects;
    cachedMessages = messages;
    const unreadCount = messages.filter((m) => !m.read).length;

    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="metric-card" onclick="window.switchView('projects')" style="cursor: pointer;">
          <div class="metric-info">
            <h3>${projects.length}</h3>
            <p>Total Projects</p>
          </div>
          <div class="metric-icon">📁</div>
        </div>
        <div class="metric-card" onclick="window.switchView('messages')" style="cursor: pointer;">
          <div class="metric-info">
            <h3 style="color: ${unreadCount > 0 ? '#00f0ff' : '#fff'};">${unreadCount}</h3>
            <p>Unread Messages (${messages.length} total)</p>
          </div>
          <div class="metric-icon">✉️</div>
        </div>
        <div class="metric-card" onclick="window.switchView('skills')" style="cursor: pointer;">
          <div class="metric-info">
            <h3>${skills.length}</h3>
            <p>Skills Active</p>
          </div>
          <div class="metric-icon">⚡</div>
        </div>
        <div class="metric-card" onclick="window.switchView('services')" style="cursor: pointer;">
          <div class="metric-info">
            <h3>${services.length}</h3>
            <p>Services Offered</p>
          </div>
          <div class="metric-icon">🛠️</div>
        </div>
        <div class="metric-card" onclick="window.switchView('media')" style="cursor: pointer;">
          <div class="metric-info">
            <h3>${media.length}</h3>
            <p>Media Assets</p>
          </div>
          <div class="metric-icon">🖼️</div>
        </div>
        <div class="metric-card" onclick="window.switchView('testimonials')" style="cursor: pointer;">
          <div class="metric-info">
            <h3>${testimonials}</h3>
            <p>Testimonials</p>
          </div>
          <div class="metric-icon">💬</div>
        </div>
      </div>

      <!-- Quick Action Bar -->
      <div class="admin-card" style="margin-bottom: 2rem;">
        <div class="card-header">
          <span class="card-header-title">⚡ Quick Management Shortcuts</span>
          <button id="quickSeedBtn" class="btn-admin btn-dark btn-sm">🔄 Re-Seed / Restore Sample Data</button>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn-admin btn-cyan" onclick="window.switchView('projects')">+ Add New Project</button>
          <button class="btn-admin btn-dark" onclick="window.switchView('profile')">Edit Profile & Avatar</button>
          <button class="btn-admin btn-dark" onclick="window.switchView('messages')">View Messages</button>
          <button class="btn-admin btn-dark" onclick="window.switchView('media')">Upload Media</button>
          <a href="/" target="_blank" class="btn-admin btn-dark" style="margin-left: auto;">↗ View Live Portfolio</a>
        </div>
      </div>

      <!-- Recent Inquiries -->
      <div class="admin-card">
        <div class="card-header">
          <span class="card-header-title">Recent Inquiries (${messages.length})</span>
          <button class="btn-admin btn-dark btn-sm" onclick="window.switchView('messages')">View All</button>
        </div>
        ${
          messages.length === 0
            ? '<p style="color: #94a3b8; font-size: 0.9rem;">No messages received yet. Submit a test form on the public site!</p>'
            : `
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${messages
                  .slice(0, 5)
                  .map(
                    (m) => `
                  <tr>
                    <td><span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: ${m.read ? 'rgba(255,255,255,0.06)' : 'rgba(0,240,255,0.2)'}; color: ${m.read ? '#94a3b8' : '#00f0ff'};">${m.read ? 'Read' : 'NEW'}</span></td>
                    <td><strong>${escapeHtml(m.name)}</strong><br><small style="color: #64748b;">${escapeHtml(m.email)}</small></td>
                    <td>${escapeHtml(m.subject || 'Inquiry')}</td>
                    <td><small style="color: #94a3b8;">${formatDate(m.createdAt)}</small></td>
                    <td><button class="btn-admin btn-cyan btn-sm" onclick="window.switchView('messages')">Open</button></td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    `;

    document.getElementById('quickSeedBtn')?.addEventListener('click', seedAllPortfolioData);
  } catch (err) {
    container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Failed to load dashboard: ${err.message}</div>`;
  }
}

// Real-time unread messages badge
function initMessageNotifications() {
  if (messagesUnsubscribe) messagesUnsubscribe();
  messagesUnsubscribe = subscribeToMessages((msgs) => {
    cachedMessages = msgs;
    const unread = msgs.filter((m) => !m.read).length;
    const badgeSidebar = document.getElementById('unreadMessagesBadge');
    const badgeBottom = document.getElementById('bottomUnreadDot');

    if (badgeSidebar) {
      badgeSidebar.textContent = unread > 0 ? unread : '';
      badgeSidebar.style.display = unread > 0 ? 'inline-block' : 'none';
    }
    if (badgeBottom) {
      badgeBottom.style.display = unread > 0 ? 'block' : 'none';
    }
  });
}

// 2. Profile Management
async function renderProfileEditor(container) {
  let profile = DEFAULT_PROFILE;
  try {
    const snap = await getDoc(doc(db, 'profile', 'general'));
    if (snap.exists()) {
      profile = { ...DEFAULT_PROFILE, ...snap.data() };
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Personal Profile Details</span>
        <button id="saveProfileBtn" class="btn-admin btn-cyan">Save All Details</button>
      </div>

      <!-- Quick Upload & Delete Profile Picture System -->
      <div style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(0, 240, 255, 0.03); border-radius: 12px; border: 1px solid rgba(0, 240, 255, 0.2);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4 style="color: #fff; font-size: 1.05rem; display: flex; align-items: center; gap: 0.5rem; margin: 0;">
            <span>📸</span> Profile Picture (Quick Upload & Delete)
          </h4>
          <span id="photoLiveStatus" style="font-size: 0.78rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);">
            ● Live on Website
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
          <!-- Avatar Preview Frame with dynamic glow and status ring -->
          <div style="position: relative; width: 110px; height: 110px; border-radius: 20px; overflow: hidden; border: 2.5px solid var(--admin-cyan); box-shadow: 0 0 20px rgba(0, 240, 255, 0.2); background: #070a12; flex-shrink: 0;">
            <img id="profilePreviewImg" src="${profile.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;" />
            <div id="avatarLoadingOverlay" style="display: none; position: absolute; inset: 0; background: rgba(7, 10, 18, 0.75); display: none; align-items: center; justify-content: center; font-size: 0.75rem; color: #00f0ff; font-weight: 700; text-align: center; padding: 4px;">
              Saving...
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
              <label class="btn-admin btn-cyan btn-sm" style="cursor: pointer; padding: 0.55rem 1rem; font-weight: 700;">
                ⚡ Upload Photo
                <input type="file" id="profilePhotoInput" accept="image/*" style="display: none;" />
              </label>

              <button type="button" id="quickDeletePhotoBtn" class="btn-admin btn-danger btn-sm" style="padding: 0.55rem 0.9rem;">
                🗑️ Quick Delete
              </button>
            </div>

            <div id="photoUploadFeedback" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
              Auto-compressed to ~60KB for instant loading. Changes save to the live site automatically.
            </div>
          </div>
        </div>

        <!-- Quick Direct URL Input & Presets -->
        <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 1rem;">
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.75rem;">
            <input type="url" id="directPhotoUrlInput" class="form-control" placeholder="Or paste any image URL (e.g. Google Drive, Unsplash, Imgur)..." value="${escapeHtml(profile.photoUrl || '')}" style="flex: 1; min-width: 220px; font-size: 0.85rem;" />
            <button type="button" id="applyDirectUrlBtn" class="btn-admin btn-dark btn-sm" style="white-space: nowrap;">
              Apply URL
            </button>
          </div>

          <!-- Quick Avatar Presets -->
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Presets:</span>
            <button type="button" class="avatar-preset-btn btn-admin btn-dark btn-sm" data-url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80" style="font-size: 0.75rem; padding: 2px 8px;">
              Executive
            </button>
            <button type="button" class="avatar-preset-btn btn-admin btn-dark btn-sm" data-url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80" style="font-size: 0.75rem; padding: 2px 8px;">
              Modern Dev
            </button>
            <button type="button" class="avatar-preset-btn btn-admin btn-dark btn-sm" data-url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80" style="font-size: 0.75rem; padding: 2px 8px;">
              Creative Headshot
            </button>
            <button type="button" class="avatar-preset-btn btn-admin btn-dark btn-sm" data-url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80" style="font-size: 0.75rem; padding: 2px 8px;">
              Tech Lead
            </button>
          </div>
        </div>
      </div>

      <form id="profileForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="profName" class="form-control" value="${escapeHtml(profile.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Professional Title</label>
            <input type="text" id="profTitle" class="form-control" value="${escapeHtml(profile.title)}" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="profEmail" class="form-control" value="${escapeHtml(profile.email)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input type="text" id="profPhone" class="form-control" value="${escapeHtml(profile.phone)}" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Location / City</label>
            <input type="text" id="profLocation" class="form-control" value="${escapeHtml(profile.location)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Availability Status</label>
            <input type="text" id="profAvailability" class="form-control" value="${escapeHtml(profile.availability)}" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Short Hero Bio</label>
          <textarea id="profShortBio" class="form-control" style="min-height: 80px;">${escapeHtml(profile.shortBio)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Full Bio / Narrative</label>
          <textarea id="profFullBio" class="form-control" style="min-height: 120px;">${escapeHtml(profile.fullBio)}</textarea>
        </div>
      </form>
    </div>
  `;

  let currentPhotoUrl = profile.photoUrl || '';

  // Elements
  const photoInput = document.getElementById('profilePhotoInput');
  const previewImg = document.getElementById('profilePreviewImg');
  const feedbackEl = document.getElementById('photoUploadFeedback');
  const overlayEl = document.getElementById('avatarLoadingOverlay');
  const liveStatusBadge = document.getElementById('photoLiveStatus');
  const directUrlInput = document.getElementById('directPhotoUrlInput');
  const applyDirectUrlBtn = document.getElementById('applyDirectUrlBtn');
  const quickDeleteBtn = document.getElementById('quickDeletePhotoBtn');

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80';

  // Helper to instantly persist avatar URL to Firestore safely
  async function saveAvatarInstantly(url, message = 'Profile picture updated & saved live!') {
    let finalUrl = url;
    // Strictly guard against oversized base64 strings
    if (finalUrl && finalUrl.startsWith('data:')) {
      finalUrl = await compressImageToDataUrl(finalUrl, 400, 0.72);
    }

    currentPhotoUrl = finalUrl;
    if (directUrlInput) directUrlInput.value = finalUrl.startsWith('data:') ? '' : finalUrl;
    if (previewImg) previewImg.src = finalUrl || DEFAULT_AVATAR;

    try {
      if (overlayEl) overlayEl.style.display = 'flex';
      await setDoc(doc(db, 'profile', 'general'), { photoUrl: finalUrl, updatedAt: new Date().toISOString() }, { merge: true });
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span style="color: #10b981; font-weight: 600;">✓ Saved to live site instantly!</span>`;
      }
      if (liveStatusBadge) {
        liveStatusBadge.textContent = '● Live Updated';
        liveStatusBadge.style.color = '#10b981';
      }
      showAdminToast(message, 'success');
    } catch (err) {
      console.error('Save photo error:', err);
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span style="color: #ef4444;">Failed to save: ${err.message}</span>`;
      }
      showAdminToast('Error saving photo: ' + err.message, 'error');
    } finally {
      if (overlayEl) overlayEl.style.display = 'none';
    }
  }

  // 1. FAST FILE UPLOAD & AUTO-SAVE
  photoInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (overlayEl) overlayEl.style.display = 'flex';
    if (feedbackEl) {
      feedbackEl.innerHTML = `<span style="color: #00f0ff;">⚡ Optimizing & saving photo...</span>`;
    }

    try {
      // 1. Immediate compact compression (< 40ms, guarantees < 60KB)
      const compactDataUrl = await compressImageToDataUrl(file, 400, 0.72);
      if (previewImg) previewImg.src = compactDataUrl;

      // 2. Try upload or fallback to compact data URL
      const res = await uploadProjectFile(file, 'profile');
      const photoToSave = (res && res.success && res.url) ? res.url : compactDataUrl;
      await saveAvatarInstantly(photoToSave, 'Profile picture updated & saved live!');
    } catch (err) {
      console.warn('Upload fallback to direct compact compression:', err);
      try {
        const compactDataUrl = await compressImageToDataUrl(file, 400, 0.70);
        await saveAvatarInstantly(compactDataUrl, 'Profile picture updated & saved live!');
      } catch (fallbackErr) {
        showAdminToast('Could not save photo: ' + fallbackErr.message, 'error');
      }
    } finally {
      if (overlayEl) overlayEl.style.display = 'none';
      photoInput.value = '';
    }
  });

  // 2. QUICK DELETE SYSTEM
  quickDeleteBtn?.addEventListener('click', async () => {
    if (confirm('Delete your current profile picture and reset to default?')) {
      await saveAvatarInstantly('', 'Profile picture removed & saved live!');
    }
  });

  // 3. DIRECT URL APPLY
  applyDirectUrlBtn?.addEventListener('click', async () => {
    const url = directUrlInput?.value.trim() || '';
    await saveAvatarInstantly(url, 'Profile image link applied & saved live!');
  });

  // 4. PRESET BUTTONS
  container.querySelectorAll('.avatar-preset-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      if (url) {
        await saveAvatarInstantly(url, 'Preset avatar applied & saved live!');
      }
    });
  });

  // 5. SAVE ALL DETAILS
  document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const payload = {
      name: document.getElementById('profName').value.trim(),
      title: document.getElementById('profTitle').value.trim(),
      email: document.getElementById('profEmail').value.trim(),
      phone: document.getElementById('profPhone').value.trim(),
      location: document.getElementById('profLocation').value.trim(),
      availability: document.getElementById('profAvailability').value.trim(),
      shortBio: document.getElementById('profShortBio').value.trim(),
      fullBio: document.getElementById('profFullBio').value.trim(),
      photoUrl: currentPhotoUrl,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'profile', 'general'), payload, { merge: true });
      showAdminToast('Profile updated successfully!', 'success');
    } catch (err) {
      showAdminToast('Failed to save profile: ' + err.message, 'error');
    }
  });
}

// 3. About Section Editor
async function renderAboutEditor(container) {
  let about = DEFAULT_ABOUT;
  try {
    const snap = await getDoc(doc(db, 'about', 'general'));
    if (snap.exists()) {
      about = { ...DEFAULT_ABOUT, ...snap.data() };
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">About Section Narrative & Highlights</span>
        <button id="saveAboutBtn" class="btn-admin btn-cyan">Save About</button>
      </div>

      <div class="form-group">
        <label class="form-label">Subheading / Motto</label>
        <input type="text" id="aboutSubheadingInput" class="form-control" value="${escapeHtml(about.subheading || '')}" />
      </div>

      <div class="form-group">
        <label class="form-label">Full About Paragraphs (HTML or Plain Text with linebreaks)</label>
        <textarea id="aboutContentInput" class="form-control" style="min-height: 220px;">${escapeHtml(about.content || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Resume / CV Link or Storage URL</label>
        <input type="text" id="aboutCvInput" class="form-control" value="${escapeHtml(about.cvUrl || '')}" placeholder="https://example.com/cv.pdf or #contact" />
      </div>
    </div>
  `;

  document.getElementById('saveAboutBtn')?.addEventListener('click', async () => {
    const payload = {
      subheading: document.getElementById('aboutSubheadingInput').value.trim(),
      content: document.getElementById('aboutContentInput').value.trim(),
      cvUrl: document.getElementById('aboutCvInput').value.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'about', 'general'), payload, { merge: true });
      showAdminToast('About content saved successfully!', 'success');
    } catch (err) {
      showAdminToast('Failed to save about: ' + err.message, 'error');
    }
  });
}

// 4. Statistics Manager
async function renderStatisticsManager(container) {
  let stats = DEFAULT_STATISTICS;
  try {
    const q = query(collection(db, 'statistics'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      stats = [];
      snap.forEach((d) => stats.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Statistics & Milestones (${stats.length})</span>
        <button id="addNewStatBtn" class="btn-admin btn-cyan btn-sm">+ Add Stat</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Value (e.g. 50+)</th>
              <th>Label (e.g. Projects Completed)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${stats
              .map(
                (s, idx) => `
              <tr>
                <td>${s.order || idx + 1}</td>
                <td><strong style="color: var(--admin-cyan);">${escapeHtml(s.value)}</strong></td>
                <td>${escapeHtml(s.label)}</td>
                <td>
                  <button class="btn-admin btn-dark btn-sm edit-stat-btn" data-id="${s.id}">Edit</button>
                  <button class="btn-admin btn-danger btn-sm delete-stat-btn" data-id="${s.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Hook Add
  document.getElementById('addNewStatBtn')?.addEventListener('click', async () => {
    const value = prompt('Enter Statistic Value (e.g., 50+):', '50+');
    if (!value) return;
    const label = prompt('Enter Statistic Label (e.g., Projects Completed):', 'Projects Completed');
    if (!label) return;

    const id = 'stat_' + Date.now();
    await setDoc(doc(db, 'statistics', id), {
      value,
      label,
      order: stats.length + 1,
    });
    showAdminToast('Statistic added!', 'success');
    renderStatisticsManager(container);
  });

  // Hook Edit & Delete
  container.querySelectorAll('.edit-stat-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = stats.find((x) => x.id === id);
      if (!item) return;

      const newValue = prompt('Edit Value:', item.value);
      if (newValue === null) return;
      const newLabel = prompt('Edit Label:', item.label);
      if (newLabel === null) return;

      await setDoc(doc(db, 'statistics', id), { value: newValue, label: newLabel }, { merge: true });
      showAdminToast('Statistic updated!', 'success');
      renderStatisticsManager(container);
    });
  });

  container.querySelectorAll('.delete-stat-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this statistic?')) {
        await deleteDoc(doc(db, 'statistics', id));
        showAdminToast('Statistic deleted.', 'info');
        renderStatisticsManager(container);
      }
    });
  });
}

// 5. Skills Manager
async function renderSkillsManager(container) {
  const skills = await fetchSkills();
  cachedSkills = skills;

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Technical Skills (${skills.length})</span>
        <button id="addSkillBtn" class="btn-admin btn-cyan btn-sm">+ Add Skill</button>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Skill Name</th>
              <th>Category</th>
              <th>Proficiency</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${skills
              .map(
                (s) => `
              <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(s.category || 'General')}</span></td>
                <td>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; max-width: 80px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden;">
                      <div style="width: ${s.level || 85}%; height: 100%; background: var(--admin-cyan);"></div>
                    </div>
                    <span>${s.level || 85}%</span>
                  </div>
                </td>
                <td>
                  <button class="btn-admin btn-sm toggle-skill-btn" data-id="${s.id}" style="background: ${s.enabled !== false ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${s.enabled !== false ? '#10b981' : '#ef4444'};">
                    ${s.enabled !== false ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td>
                  <button class="btn-admin btn-dark btn-sm edit-skill-btn" data-id="${s.id}">Edit</button>
                  <button class="btn-admin btn-danger btn-sm delete-skill-btn" data-id="${s.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Add Skill
  document.getElementById('addSkillBtn')?.addEventListener('click', async () => {
    const name = prompt('Skill Name (e.g. PHP, Laravel, React):');
    if (!name) return;
    const category = prompt('Category (Frontend, Backend, Database, CMS, Tools, Mobile, Design):', 'Backend');
    const level = parseInt(prompt('Proficiency percentage (1-100):', '85') || '85', 10);

    await saveSkill(null, {
      name,
      category: category || 'General',
      level: isNaN(level) ? 85 : level,
      enabled: true,
      order: skills.length + 1,
    });
    showAdminToast('Skill added!', 'success');
    renderSkillsManager(container);
  });

  // Toggle status
  container.querySelectorAll('.toggle-skill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = skills.find((x) => x.id === id);
      if (!item) return;
      await saveSkill(id, { enabled: !item.enabled });
      renderSkillsManager(container);
    });
  });

  // Edit
  container.querySelectorAll('.edit-skill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = skills.find((x) => x.id === id);
      if (!item) return;

      const newName = prompt('Edit Skill Name:', item.name);
      if (!newName) return;
      const newCat = prompt('Edit Category:', item.category);
      const newLvl = parseInt(prompt('Edit Proficiency (1-100):', item.level) || '85', 10);

      await saveSkill(id, { name: newName, category: newCat, level: newLvl });
      showAdminToast('Skill updated!', 'success');
      renderSkillsManager(container);
    });
  });

  // Delete
  container.querySelectorAll('.delete-skill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this skill?')) {
        await removeSkill(id);
        showAdminToast('Skill deleted.', 'info');
        renderSkillsManager(container);
      }
    });
  });
}

// 6. Services Manager
async function renderServicesManager(container) {
  const services = await fetchServices();
  cachedServices = services;

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Services Offered (${services.length})</span>
        <button id="addServiceBtn" class="btn-admin btn-cyan btn-sm">+ Add Service</button>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${services
              .map(
                (serv) => `
              <tr>
                <td><strong>${escapeHtml(serv.title)}</strong></td>
                <td style="max-width: 320px; font-size: 0.85rem; color: #94a3b8;">${escapeHtml(serv.description)}</td>
                <td>
                  <button class="btn-admin btn-sm toggle-service-btn" data-id="${serv.id}" style="background: ${serv.enabled !== false ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${serv.enabled !== false ? '#10b981' : '#ef4444'};">
                    ${serv.enabled !== false ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td>
                  <button class="btn-admin btn-dark btn-sm edit-service-btn" data-id="${serv.id}">Edit</button>
                  <button class="btn-admin btn-danger btn-sm delete-service-btn" data-id="${serv.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addServiceBtn')?.addEventListener('click', async () => {
    const title = prompt('Service Title:');
    if (!title) return;
    const description = prompt('Service Description:');
    if (!description) return;

    await saveService(null, {
      title,
      description,
      icon: 'code',
      enabled: true,
      order: services.length + 1,
    });
    showAdminToast('Service added!', 'success');
    renderServicesManager(container);
  });

  container.querySelectorAll('.toggle-service-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = services.find((x) => x.id === id);
      if (!item) return;
      await saveService(id, { enabled: !item.enabled });
      renderServicesManager(container);
    });
  });

  container.querySelectorAll('.edit-service-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = services.find((x) => x.id === id);
      if (!item) return;

      const newTitle = prompt('Edit Title:', item.title);
      if (!newTitle) return;
      const newDesc = prompt('Edit Description:', item.description);
      if (!newDesc) return;

      await saveService(id, { title: newTitle, description: newDesc });
      showAdminToast('Service updated!', 'success');
      renderServicesManager(container);
    });
  });

  container.querySelectorAll('.delete-service-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this service?')) {
        await removeService(id);
        showAdminToast('Service deleted.', 'info');
        renderServicesManager(container);
      }
    });
  });
}

// 7. Projects Manager (Dynamic Project CRUD with Gallery Uploads)
async function renderProjectsManager(container) {
  const projects = await fetchProjects();
  cachedProjects = projects;

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Projects Portfolio (${projects.length})</span>
        <button id="openNewProjectModalBtn" class="btn-admin btn-cyan btn-sm">+ Add New Project</button>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Thumb</th>
              <th>Title</th>
              <th>Category</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${projects
              .map(
                (p) => `
              <tr>
                <td>
                  <img src="${p.thumbnail || 'https://images.unsplash.com/photo-1557821552-17105176677c?w=100'}" alt="" style="width: 48px; height: 36px; object-fit: cover; border-radius: 4px;" />
                </td>
                <td><strong>${escapeHtml(p.title)}</strong></td>
                <td><span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; font-size: 0.78rem;">${escapeHtml(p.category || 'General')}</span></td>
                <td>${p.featured ? '<span style="color: #00f0ff; font-weight: 700;">★ Yes</span>' : '<span style="color: #64748b;">No</span>'}</td>
                <td>${p.published !== false ? '<span style="color: #10b981;">Published</span>' : '<span style="color: #f59e0b;">Draft</span>'}</td>
                <td>
                  <button class="btn-admin btn-dark btn-sm edit-proj-btn" data-id="${p.id}">Edit</button>
                  <button class="btn-admin btn-danger btn-sm delete-proj-btn" data-id="${p.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Project Edit / Create Modal Container -->
    <div id="projectFormModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 680px;">
        <button class="modal-close-btn" id="closeProjModalBtn">✕</button>
        <h3 id="projModalTitle" style="font-size: 1.35rem; margin-bottom: 1.25rem;">Add New Project</h3>

        <form id="projectEditorForm">
          <input type="hidden" id="editProjId" value="" />

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Project Title *</label>
              <input type="text" id="pTitle" class="form-control" required placeholder="e.g. E-Commerce Platform" />
            </div>
            <div class="form-group">
              <label class="form-label">Category *</label>
              <select id="pCategory" class="form-control">
                <option value="Full Stack">Full Stack</option>
                <option value="Web Design">Web Design</option>
                <option value="Web Application">Web Application</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Mobile App">Mobile App</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description *</label>
            <textarea id="pDesc" class="form-control" required style="min-height: 90px;" placeholder="Detailed overview of project goals, architecture, and outcomes"></textarea>
          </div>

          <!-- Thumbnail Upload -->
          <div class="form-group">
            <label class="form-label">Thumbnail Image (Storage Upload or Camera)</label>
            <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
              <img id="pThumbPreview" src="" alt="Preview" style="width: 80px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid var(--admin-border); display: none;" />
              <label class="btn-admin btn-dark btn-sm" style="cursor: pointer;">
                📷 Upload Thumbnail
                <input type="file" id="pThumbFileInput" accept="image/*" style="display: none;" />
              </label>
              <input type="text" id="pThumbUrl" class="form-control" placeholder="Or paste image URL" style="flex: 1; min-width: 200px;" />
            </div>
          </div>

          <!-- Multiple Gallery Images Upload -->
          <div class="form-group">
            <label class="form-label">Gallery Screenshots (Multiple Images)</label>
            <div style="margin-bottom: 0.5rem;">
              <label class="btn-admin btn-dark btn-sm" style="cursor: pointer;">
                📸 Add Gallery Images (Select Multiple)
                <input type="file" id="pGalleryFileInput" accept="image/*" multiple style="display: none;" />
              </label>
              <span id="galleryUploadStatus" style="font-size: 0.8rem; color: var(--admin-cyan); margin-left: 0.5rem;"></span>
            </div>
            <div id="pGalleryPreviewGrid" class="preview-grid" style="margin-top: 0.5rem;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Technologies (Comma separated)</label>
            <input type="text" id="pTechs" class="form-control" placeholder="Laravel, PHP, MySQL, Tailwind CSS, JavaScript" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Live Project URL</label>
              <input type="url" id="pLiveUrl" class="form-control" placeholder="https://example.com" />
            </div>
            <div class="form-group">
              <label class="form-label">GitHub Repository URL</label>
              <input type="url" id="pGithubUrl" class="form-control" placeholder="https://github.com/..." />
            </div>
          </div>

          <div class="form-row" style="margin-top: 0.5rem;">
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="pFeatured" style="width: 18px; height: 18px;" />
              <label for="pFeatured" style="font-size: 0.9rem; color: #fff; cursor: pointer;">Featured Project (Home Hero Badge)</label>
            </div>
            <div class="form-group" style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="pPublished" checked style="width: 18px; height: 18px;" />
              <label for="pPublished" style="font-size: 0.9rem; color: #fff; cursor: pointer;">Published (Visible on Portfolio)</label>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="button" class="btn-admin btn-dark" id="cancelProjModalBtn">Cancel</button>
            <button type="submit" class="btn-admin btn-cyan" id="saveProjFormBtn">Save Project</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = document.getElementById('projectFormModal');
  const closeBtn = document.getElementById('closeProjModalBtn');
  const cancelBtn = document.getElementById('cancelProjModalBtn');
  const openNewBtn = document.getElementById('openNewProjectModalBtn');
  const form = document.getElementById('projectEditorForm');
  const thumbInput = document.getElementById('pThumbFileInput');
  const thumbPreview = document.getElementById('pThumbPreview');
  const thumbUrlInput = document.getElementById('pThumbUrl');
  const galleryInput = document.getElementById('pGalleryFileInput');
  const galleryGrid = document.getElementById('pGalleryPreviewGrid');
  const galleryStatus = document.getElementById('galleryUploadStatus');

  let activeGalleryImages = [];

  const closeModal = () => modal?.classList.remove('open');
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Open New
  openNewBtn?.addEventListener('click', () => {
    document.getElementById('projModalTitle').textContent = 'Add New Project';
    document.getElementById('editProjId').value = '';
    form.reset();
    activeGalleryImages = [];
    renderGalleryThumbnails(activeGalleryImages, galleryGrid);
    if (thumbPreview) thumbPreview.style.display = 'none';
    modal?.classList.add('open');
  });

  // Thumbnail File Upload
  thumbInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await uploadProjectFile(file, 'projects');
    if (res.success) {
      thumbUrlInput.value = res.url;
      if (thumbPreview) {
        thumbPreview.src = res.url;
        thumbPreview.style.display = 'block';
      }
    }
  });

  // Multiple Gallery Upload
  galleryInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    galleryStatus.textContent = `Uploading ${files.length} image(s)...`;
    for (const file of files) {
      const res = await uploadProjectFile(file, 'projects');
      if (res.success) {
        activeGalleryImages.push(res.url);
      }
    }
    galleryStatus.textContent = 'Uploaded!';
    renderGalleryThumbnails(activeGalleryImages, galleryGrid);
  });

  function renderGalleryThumbnails(urls, targetGrid) {
    if (!targetGrid) return;
    targetGrid.innerHTML = urls
      .map(
        (url, idx) => `
      <div class="preview-card">
        <img src="${url}" alt="" />
        <button type="button" class="preview-delete-btn remove-gallery-item-btn" data-index="${idx}">✕</button>
      </div>
    `
      )
      .join('');

    targetGrid.querySelectorAll('.remove-gallery-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-index'), 10);
        activeGalleryImages.splice(index, 1);
        renderGalleryThumbnails(activeGalleryImages, targetGrid);
      });
    });
  }

  // Edit Project
  container.querySelectorAll('.edit-proj-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const p = projects.find((x) => x.id === id);
      if (!p) return;

      document.getElementById('projModalTitle').textContent = 'Edit Project';
      document.getElementById('editProjId').value = p.id;
      document.getElementById('pTitle').value = p.title || '';
      document.getElementById('pCategory').value = p.category || 'Full Stack';
      document.getElementById('pDesc').value = p.description || '';
      document.getElementById('pThumbUrl').value = p.thumbnail || '';
      if (thumbPreview && p.thumbnail) {
        thumbPreview.src = p.thumbnail;
        thumbPreview.style.display = 'block';
      }
      document.getElementById('pTechs').value = (p.technologies || []).join(', ');
      document.getElementById('pLiveUrl').value = p.liveUrl || '';
      document.getElementById('pGithubUrl').value = p.githubUrl || '';
      document.getElementById('pFeatured').checked = !!p.featured;
      document.getElementById('pPublished').checked = p.published !== false;

      activeGalleryImages = [...(p.images || [])];
      renderGalleryThumbnails(activeGalleryImages, galleryGrid);
      modal?.classList.add('open');
    });
  });

  // Delete Project
  container.querySelectorAll('.delete-proj-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this project?')) {
        await removeProject(id);
        showAdminToast('Project deleted.', 'info');
        renderProjectsManager(container);
      }
    });
  });

  // Submit Project Form
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editProjId').value;
    const title = document.getElementById('pTitle').value.trim();
    const category = document.getElementById('pCategory').value;
    const description = document.getElementById('pDesc').value.trim();
    const thumbnail = document.getElementById('pThumbUrl').value.trim() || 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800';
    const techStr = document.getElementById('pTechs').value;
    const technologies = techStr
      ? techStr.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Web'];
    const liveUrl = document.getElementById('pLiveUrl').value.trim();
    const githubUrl = document.getElementById('pGithubUrl').value.trim();
    const featured = document.getElementById('pFeatured').checked;
    const published = document.getElementById('pPublished').checked;

    const projectData = {
      title,
      category,
      description,
      thumbnail,
      images: activeGalleryImages.length > 0 ? activeGalleryImages : [thumbnail],
      technologies,
      liveUrl,
      githubUrl,
      featured,
      published,
      order: id ? undefined : projects.length + 1,
    };

    const res = await saveProject(id || null, projectData);
    if (res.success) {
      showAdminToast('Project saved successfully!', 'success');
      closeModal();
      renderProjectsManager(container);
    } else {
      showAdminToast('Failed to save project: ' + res.error, 'error');
    }
  });
}

// 8. Experience Manager
async function renderExperienceManager(container) {
  let list = DEFAULT_EXPERIENCES;
  try {
    const q = query(collection(db, 'experiences'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Career & Work Experience (${list.length})</span>
        <button id="addExpBtn" class="btn-admin btn-cyan btn-sm">+ Add Experience</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Period</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (exp) => `
              <tr>
                <td><strong>${escapeHtml(exp.jobTitle)}</strong></td>
                <td>${escapeHtml(exp.company)}</td>
                <td>${escapeHtml(exp.startDate)} - ${escapeHtml(exp.endDate || 'Present')}</td>
                <td>
                  <button class="btn-admin btn-danger btn-sm delete-exp-btn" data-id="${exp.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addExpBtn')?.addEventListener('click', async () => {
    const jobTitle = prompt('Job Title (e.g. Full Stack Developer):');
    if (!jobTitle) return;
    const company = prompt('Company Name:');
    if (!company) return;
    const startDate = prompt('Start Date (e.g. 2023):', '2023');
    const endDate = prompt('End Date (e.g. Present):', 'Present');
    const description = prompt('Job Responsibilities / Description:');

    const id = 'exp_' + Date.now();
    await setDoc(doc(db, 'experiences', id), {
      jobTitle,
      company,
      location: 'Remote',
      startDate: startDate || '',
      endDate: endDate || 'Present',
      description: description || '',
      order: list.length + 1,
    });
    showAdminToast('Experience added!', 'success');
    renderExperienceManager(container);
  });

  container.querySelectorAll('.delete-exp-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this experience?')) {
        await deleteDoc(doc(db, 'experiences', id));
        renderExperienceManager(container);
      }
    });
  });
}

// 9. Education Manager
async function renderEducationManager(container) {
  let list = DEFAULT_EDUCATION;
  try {
    const q = query(collection(db, 'education'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Education (${list.length})</span>
        <button id="addEduBtn" class="btn-admin btn-cyan btn-sm">+ Add Education</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Degree</th>
              <th>Field</th>
              <th>Institution</th>
              <th>Years</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (edu) => `
              <tr>
                <td><strong>${escapeHtml(edu.degree)}</strong></td>
                <td>${escapeHtml(edu.field)}</td>
                <td>${escapeHtml(edu.institution)}</td>
                <td>${escapeHtml(edu.startYear)} - ${escapeHtml(edu.endYear)}</td>
                <td>
                  <button class="btn-admin btn-danger btn-sm delete-edu-btn" data-id="${edu.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addEduBtn')?.addEventListener('click', async () => {
    const degree = prompt('Degree (e.g. Diploma in Engineering):', 'Diploma in Engineering');
    if (!degree) return;
    const field = prompt('Field of Study:', 'Computer Technology');
    if (!field) return;
    const institution = prompt('Institution Name:');
    if (!institution) return;

    const id = 'edu_' + Date.now();
    await setDoc(doc(db, 'education', id), {
      degree,
      field,
      institution,
      startYear: '2019',
      endYear: '2023',
      description: 'Computer systems, programming, and software engineering.',
      order: list.length + 1,
    });
    showAdminToast('Education added!', 'success');
    renderEducationManager(container);
  });

  container.querySelectorAll('.delete-edu-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this education entry?')) {
        await deleteDoc(doc(db, 'education', id));
        renderEducationManager(container);
      }
    });
  });
}

// 10. Certifications Manager
async function renderCertificationsManager(container) {
  let list = DEFAULT_CERTIFICATIONS;
  try {
    const q = query(collection(db, 'certifications'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Certifications & Badges (${list.length})</span>
        <button id="addCertBtn" class="btn-admin btn-cyan btn-sm">+ Add Certificate</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Organization</th>
              <th>Issue Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (c) => `
              <tr>
                <td><strong>${escapeHtml(c.title)}</strong></td>
                <td>${escapeHtml(c.organization)}</td>
                <td>${escapeHtml(c.issueDate)}</td>
                <td>
                  <button class="btn-admin btn-danger btn-sm delete-cert-btn" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addCertBtn')?.addEventListener('click', async () => {
    const title = prompt('Certificate Title:');
    if (!title) return;
    const organization = prompt('Issuing Organization:');
    if (!organization) return;
    const credentialId = prompt('Credential ID (Optional):') || '';
    const credentialUrl = prompt('Credential URL (Optional):') || '';

    const id = 'cert_' + Date.now();
    await setDoc(doc(db, 'certifications', id), {
      title,
      organization,
      issueDate: new Date().getFullYear().toString(),
      credentialId,
      credentialUrl,
      order: list.length + 1,
    });
    showAdminToast('Certificate added!', 'success');
    renderCertificationsManager(container);
  });

  container.querySelectorAll('.delete-cert-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete certificate?')) {
        await deleteDoc(doc(db, 'certifications', id));
        renderCertificationsManager(container);
      }
    });
  });
}

// 11. Testimonials Manager
async function renderTestimonialsManager(container) {
  let list = DEFAULT_TESTIMONIALS;
  try {
    const q = query(collection(db, 'testimonials'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Client Testimonials (${list.length})</span>
        <button id="addTestimonialBtn" class="btn-admin btn-cyan btn-sm">+ Add Testimonial</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Company</th>
              <th>Testimonial</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (t) => `
              <tr>
                <td><strong>${escapeHtml(t.clientName)}</strong></td>
                <td>${escapeHtml(t.company)}</td>
                <td style="max-width: 280px; font-size: 0.85rem; color: #94a3b8;">${escapeHtml(t.testimonial)}</td>
                <td>
                  <span style="color: ${t.enabled !== false ? '#10b981' : '#ef4444'}; font-weight: 600;">
                    ${t.enabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <button class="btn-admin btn-danger btn-sm delete-test-btn" data-id="${t.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addTestimonialBtn')?.addEventListener('click', async () => {
    const clientName = prompt('Client Name:');
    if (!clientName) return;
    const company = prompt('Company / Role:');
    if (!company) return;
    const testimonial = prompt('Review / Testimonial text:');
    if (!testimonial) return;

    const id = 'test_' + Date.now();
    await setDoc(doc(db, 'testimonials', id), {
      clientName,
      company,
      testimonial,
      rating: 5,
      enabled: true,
      order: list.length + 1,
    });
    showAdminToast('Testimonial added!', 'success');
    renderTestimonialsManager(container);
  });

  container.querySelectorAll('.delete-test-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete testimonial?')) {
        await deleteDoc(doc(db, 'testimonials', id));
        renderTestimonialsManager(container);
      }
    });
  });
}

// 12. Clients Manager (Trusted By)
async function renderClientsManager(container) {
  let list = DEFAULT_CLIENTS;
  try {
    const q = query(collection(db, 'clients'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Trusted Clients & Brands (${list.length})</span>
        <button id="addClientBtn" class="btn-admin btn-cyan btn-sm">+ Add Client</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Website</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (c) => `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td><a href="${c.websiteUrl || '#'}" target="_blank" style="color: var(--admin-cyan);">${escapeHtml(c.websiteUrl || '-')}</a></td>
                <td>${c.enabled !== false ? '<span style="color: #10b981;">Active</span>' : '<span style="color: #ef4444;">Hidden</span>'}</td>
                <td>
                  <button class="btn-admin btn-danger btn-sm delete-client-btn" data-id="${c.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addClientBtn')?.addEventListener('click', async () => {
    const name = prompt('Client / Brand Name:');
    if (!name) return;
    const websiteUrl = prompt('Client Website URL:', 'https://example.com');

    const id = 'client_' + Date.now();
    await setDoc(doc(db, 'clients', id), {
      name,
      websiteUrl: websiteUrl || '',
      enabled: true,
      order: list.length + 1,
    });
    showAdminToast('Client added!', 'success');
    renderClientsManager(container);
  });

  container.querySelectorAll('.delete-client-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete client?')) {
        await deleteDoc(doc(db, 'clients', id));
        renderClientsManager(container);
      }
    });
  });
}

// 13. Messages Manager (Inquiries)
async function renderMessagesManager(container) {
  const messages = await fetchMessages();
  cachedMessages = messages;

  const unreadCount = messages.filter((m) => !m.read).length;

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div>
          <span class="card-header-title">Inbound Contact Messages (${messages.length})</span>
          <span style="display: inline-block; margin-left: 0.5rem; padding: 2px 8px; border-radius: 999px; background: rgba(0,240,255,0.2); color: #00f0ff; font-size: 0.8rem; font-weight: 700;">${unreadCount} Unread</span>
        </div>
      </div>

      ${
        messages.length === 0
          ? '<p style="color: #94a3b8; padding: 2rem 0; text-align: center;">No messages yet.</p>'
          : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Sender</th>
                <th>Subject</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${messages
                .map(
                  (m) => `
                <tr style="${!m.read ? 'background: rgba(0, 240, 255, 0.04);' : ''}">
                  <td>
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: ${m.read ? 'rgba(255,255,255,0.06)' : 'rgba(0,240,255,0.2)'}; color: ${m.read ? '#94a3b8' : '#00f0ff'};">
                      ${m.read ? 'Read' : 'NEW'}
                    </span>
                  </td>
                  <td>
                    <strong>${escapeHtml(m.name)}</strong><br>
                    <small style="color: #94a3b8;">${escapeHtml(m.email)}</small><br>
                    ${m.phone ? `<small style="color: #64748b;">${escapeHtml(m.phone)}</small>` : ''}
                  </td>
                  <td>${escapeHtml(m.subject || 'Inquiry')}</td>
                  <td><small style="color: #94a3b8;">${formatDate(m.createdAt)}</small></td>
                  <td>
                    <button class="btn-admin btn-cyan btn-sm view-msg-btn" data-id="${m.id}">View</button>
                    <button class="btn-admin btn-dark btn-sm toggle-read-btn" data-id="${m.id}">${m.read ? 'Unread' : 'Mark Read'}</button>
                    <button class="btn-admin btn-danger btn-sm delete-msg-btn" data-id="${m.id}">✕</button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    </div>

    <!-- Message Details Modal -->
    <div id="messageDetailModal" class="modal-overlay">
      <div class="modal-content" style="max-width: 560px;">
        <button class="modal-close-btn" id="closeMsgModalBtn">✕</button>
        <h3 id="msgModalSender" style="font-size: 1.35rem; margin-bottom: 0.25rem;">Sender Details</h3>
        <p id="msgModalMeta" style="color: var(--admin-text-sub); font-size: 0.85rem; margin-bottom: 1.25rem;"></p>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
          <h4 id="msgModalSubject" style="color: var(--admin-cyan); margin-bottom: 0.75rem;">Subject</h4>
          <p id="msgModalBody" style="color: #fff; line-height: 1.6; white-space: pre-line;"></p>
        </div>
        <div id="msgModalActions" style="display: flex; gap: 0.75rem; flex-wrap: wrap;"></div>
      </div>
    </div>
  `;

  const modal = document.getElementById('messageDetailModal');
  const closeBtn = document.getElementById('closeMsgModalBtn');
  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

  // View Message
  container.querySelectorAll('.view-msg-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const msg = messages.find((x) => x.id === id);
      if (!msg) return;

      // Automatically mark as read
      if (!msg.read) {
        await setMessageReadStatus(id, true);
        msg.read = true;
      }

      document.getElementById('msgModalSender').textContent = msg.name;
      document.getElementById('msgModalMeta').textContent = `${msg.email} ${msg.phone ? '• ' + msg.phone : ''} • ${formatDate(msg.createdAt)}`;
      document.getElementById('msgModalSubject').textContent = msg.subject || 'Portfolio Inquiry';
      document.getElementById('msgModalBody').textContent = msg.message;

      const actionsContainer = document.getElementById('msgModalActions');
      actionsContainer.innerHTML = `
        <a href="mailto:${encodeURIComponent(msg.email)}?subject=Re: ${encodeURIComponent(msg.subject || 'Inquiry')}" class="btn-admin btn-cyan">Reply via Email</a>
        ${msg.phone ? `<a href="https://wa.me/${encodeURIComponent(msg.phone.replace(/[^0-9]/g, ''))}" target="_blank" class="btn-admin btn-dark">WhatsApp</a>` : ''}
        <button class="btn-admin btn-danger delete-current-msg-btn" style="margin-left: auto;">Delete</button>
      `;

      actionsContainer.querySelector('.delete-current-msg-btn')?.addEventListener('click', async () => {
        if (confirm('Delete this message?')) {
          await removeMessage(id);
          modal?.classList.remove('open');
          showAdminToast('Message deleted.', 'info');
          renderMessagesManager(container);
        }
      });

      modal?.classList.add('open');
    });
  });

  // Toggle read status
  container.querySelectorAll('.toggle-read-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const msg = messages.find((x) => x.id === id);
      if (!msg) return;
      await setMessageReadStatus(id, !msg.read);
      renderMessagesManager(container);
    });
  });

  // Delete message
  container.querySelectorAll('.delete-msg-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this message?')) {
        await removeMessage(id);
        showAdminToast('Message deleted.', 'info');
        renderMessagesManager(container);
      }
    });
  });
}

// 14. Media Library & Storage
async function renderMediaManager(container) {
  const media = await fetchMediaItems();
  cachedMedia = media;

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Media Library (Firebase Storage: ${media.length} files)</span>
        <label class="btn-admin btn-cyan btn-sm" style="cursor: pointer;">
          📤 Upload Files
          <input type="file" id="mediaUploadInput" multiple accept="image/*" style="display: none;" />
        </label>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <input type="text" id="mediaSearchInput" class="form-control" placeholder="Search files by name..." />
      </div>

      <div id="mediaUploadStatus" style="color: var(--admin-cyan); font-size: 0.9rem; margin-bottom: 1rem; display: none;"></div>

      <div id="mediaGrid" class="preview-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;">
        ${
          media.length === 0
            ? '<p style="grid-column: 1/-1; color: #94a3b8; text-align: center; padding: 2rem;">No media uploaded yet. Tap "Upload Files" to upload photos.</p>'
            : media
                .map(
                  (m) => `
              <div class="admin-card" style="padding: 0.75rem; margin-bottom: 0; display: flex; flex-direction: column;">
                <div style="width: 100%; height: 120px; border-radius: 8px; overflow: hidden; background: #000; margin-bottom: 0.5rem;">
                  <img src="${m.url}" alt="${escapeHtml(m.name)}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div style="font-size: 0.8rem; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">
                  ${escapeHtml(m.name)}
                </div>
                <div style="font-size: 0.72rem; color: #64748b; margin-bottom: 0.75rem;">
                  ${formatBytes(m.size || 0)} • ${formatDate(m.uploadedAt)}
                </div>
                <div style="display: flex; gap: 0.4rem; margin-top: auto;">
                  <button class="btn-admin btn-dark btn-sm copy-media-url-btn" data-url="${m.url}" style="flex: 1; font-size: 0.75rem;">Copy URL</button>
                  <button class="btn-admin btn-danger btn-sm delete-media-btn" data-id="${m.id}" data-path="${m.storagePath || ''}">✕</button>
                </div>
              </div>
            `
                )
                .join('')
        }
      </div>
    </div>
  `;

  // Search filter
  const searchInput = document.getElementById('mediaSearchInput');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const cards = container.querySelectorAll('#mediaGrid > .admin-card');
    cards.forEach((card) => {
      const text = card.textContent?.toLowerCase() || '';
      card.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });

  // Upload handler
  const uploadInput = document.getElementById('mediaUploadInput');
  const uploadStatus = document.getElementById('mediaUploadStatus');
  uploadInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (uploadStatus) {
      uploadStatus.style.display = 'block';
      uploadStatus.textContent = `Uploading ${files.length} file(s) to Firebase Storage...`;
    }

    for (const file of files) {
      try {
        await uploadMediaFile(file, 'media');
      } catch (err) {
        console.error(err);
      }
    }

    showAdminToast('Files uploaded successfully!', 'success');
    renderMediaManager(container);
  });

  // Copy URL
  container.querySelectorAll('.copy-media-url-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-url');
      navigator.clipboard.writeText(url);
      showAdminToast('Media URL copied to clipboard!', 'info');
    });
  });

  // Quick Delete media (instant optimistic UI update)
  container.querySelectorAll('.delete-media-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const path = btn.getAttribute('data-path');
      if (confirm('Delete this file from Storage?')) {
        const card = btn.closest('.admin-card');
        if (card) {
          card.style.opacity = '0.3';
          card.style.pointerEvents = 'none';
          setTimeout(() => card.remove(), 200);
        }
        showAdminToast('File deleted.', 'info');
        await removeMediaItem(id, path);
      }
    });
  });
}

// 15. Social Links Manager
async function renderSocialLinksManager(container) {
  let list = DEFAULT_SOCIAL_LINKS;
  try {
    const q = query(collection(db, 'socialLinks'), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Social Links (${list.length})</span>
        <button id="addSocialBtn" class="btn-admin btn-cyan btn-sm">+ Add Social Link</button>
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>URL</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (s) => `
              <tr>
                <td><strong>${escapeHtml(s.platform)}</strong></td>
                <td><a href="${s.url}" target="_blank" style="color: var(--admin-cyan);">${escapeHtml(s.url)}</a></td>
                <td>${s.enabled !== false ? '<span style="color: #10b981;">Active</span>' : '<span style="color: #ef4444;">Disabled</span>'}</td>
                <td>
                  <button class="btn-admin btn-dark btn-sm edit-social-btn" data-id="${s.id}">Edit</button>
                  <button class="btn-admin btn-danger btn-sm delete-social-btn" data-id="${s.id}">Delete</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('addSocialBtn')?.addEventListener('click', async () => {
    const platform = prompt('Platform (GitHub, LinkedIn, Facebook, WhatsApp, YouTube, X/Twitter):');
    if (!platform) return;
    const url = prompt('Profile URL:');
    if (!url) return;

    const id = 'soc_' + Date.now();
    await setDoc(doc(db, 'socialLinks', id), {
      platform,
      url,
      enabled: true,
      order: list.length + 1,
    });
    showAdminToast('Social link added!', 'success');
    renderSocialLinksManager(container);
  });

  container.querySelectorAll('.edit-social-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = list.find((x) => x.id === id);
      if (!item) return;

      const newUrl = prompt('Edit Profile URL:', item.url);
      if (!newUrl) return;

      await setDoc(doc(db, 'socialLinks', id), { url: newUrl }, { merge: true });
      showAdminToast('Social link updated!', 'success');
      renderSocialLinksManager(container);
    });
  });

  container.querySelectorAll('.delete-social-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Delete this social link?')) {
        await deleteDoc(doc(db, 'socialLinks', id));
        renderSocialLinksManager(container);
      }
    });
  });
}

// 16. Website Settings Editor
async function renderSettingsEditor(container) {
  let settings = DEFAULT_SETTINGS;
  try {
    const snap = await getDoc(doc(db, 'settings', 'general'));
    if (snap.exists()) {
      settings = { ...DEFAULT_SETTINGS, ...snap.data() };
    }
  } catch (e) {
    console.warn(e);
  }

  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">Website Global Settings</span>
        <button id="saveSettingsBtn" class="btn-admin btn-cyan">Save Settings</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Website Name</label>
          <input type="text" id="setSiteName" class="form-control" value="${escapeHtml(settings.siteName)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Contact Phone</label>
          <input type="text" id="setPhone" class="form-control" value="${escapeHtml(settings.contactPhone || '')}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contact Email</label>
          <input type="email" id="setEmail" class="form-control" value="${escapeHtml(settings.contactEmail || '')}" />
        </div>
        <div class="form-group">
          <label class="form-label">Physical Address / City</label>
          <input type="text" id="setAddress" class="form-control" value="${escapeHtml(settings.address || '')}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Meta Title (SEO)</label>
        <input type="text" id="setMetaTitle" class="form-control" value="${escapeHtml(settings.metaTitle || '')}" />
      </div>

      <div class="form-group">
        <label class="form-label">Meta Description (SEO)</label>
        <textarea id="setMetaDesc" class="form-control" style="min-height: 80px;">${escapeHtml(settings.metaDescription || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Footer Tagline / Text</label>
        <textarea id="setFooterText" class="form-control" style="min-height: 80px;">${escapeHtml(settings.footerText || '')}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Copyright Notice</label>
        <input type="text" id="setCopyright" class="form-control" value="${escapeHtml(settings.copyright || '')}" />
      </div>
    </div>
  `;

  document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    const payload = {
      siteName: document.getElementById('setSiteName').value.trim(),
      contactPhone: document.getElementById('setPhone').value.trim(),
      contactEmail: document.getElementById('setEmail').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      metaTitle: document.getElementById('setMetaTitle').value.trim(),
      metaDescription: document.getElementById('setMetaDesc').value.trim(),
      footerText: document.getElementById('setFooterText').value.trim(),
      copyright: document.getElementById('setCopyright').value.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'settings', 'general'), payload, { merge: true });
      showAdminToast('Website settings saved!', 'success');
    } catch (err) {
      showAdminToast('Failed to save settings: ' + err.message, 'error');
    }
  });
}

// 17. Setup & Hosting Instructions Guide Modal
function renderSetupGuide(container) {
  container.innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <span class="card-header-title">📖 Complete Firebase Setup & Deployment Guide</span>
      </div>

      <div style="line-height: 1.8; color: #cbd5e1; font-size: 0.95rem;">
        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">1. Create Firebase Project</h4>
        <p>Go to <a href="https://console.firebase.google.com" target="_blank" style="color: #38bdf8;">console.firebase.google.com</a> and click <strong>Add Project</strong> (Project Name: <em>yeasin-portfolio</em>).</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">2 & 3. Enable Authentication & Email/Password</h4>
        <p>Navigate to <strong>Build > Authentication > Sign-in method</strong>. Enable <strong>Email/Password</strong> and <strong>Google</strong> provider.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">4. Create Cloud Firestore Database</h4>
        <p>Navigate to <strong>Build > Firestore Database</strong>, click <strong>Create database</strong> in Production mode, and choose your preferred region.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">5. Create Firebase Storage</h4>
        <p>Navigate to <strong>Build > Storage</strong> and click <strong>Get Started</strong> to enable cloud object storage.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">6 & 7. Add Web App & Config</h4>
        <p>In Project Settings, click <strong>Add app (Web)</strong> and copy the <code>firebaseConfig</code> credentials into <code>firebase-applet-config.json</code>.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">8. Create First Admin Account</h4>
        <p>In Authentication > Users, click <strong>Add user</strong> with your email (<code>arafatujjol567@gmail.com</code>) and a secure password.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">9. Firestore Security Rules</h4>
        <p>Already configured and deployed via <code>firestore.rules</code>: public read for portfolio items, public message submission, and authenticated write permissions.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">10. Deploy to Firebase Hosting</h4>
        <p>Run <code>npm install -g firebase-tools</code>, then <code>firebase login</code>, <code>firebase init hosting</code> (public directory: <code>dist</code>), and <code>firebase deploy</code>.</p>

        <h4 style="color: #00f0ff; margin: 1.25rem 0 0.5rem;">11. Install PWA on Android Phone</h4>
        <p>Open your deployed portfolio URL in Chrome on Android. Tap the <strong>Install App</strong> button or the 3-dots menu > <strong>Install app / Add to Home screen</strong>. The portfolio and admin panel will install as a native standalone app!</p>
      </div>
    </div>
  `;
}

// 18. Seed / Restore Initial Data
function initSeedButton() {
  const seedBtn = document.getElementById('seedPortfolioBtn');
  if (seedBtn) {
    seedBtn.addEventListener('click', seedAllPortfolioData);
  }
}

async function seedAllPortfolioData() {
  if (!confirm('Populate Cloud Firestore with Yeasin Arafat default portfolio data?')) {
    return;
  }

  showAdminToast('Seeding portfolio collections in Cloud Firestore...', 'info');

  try {
    // 1. Profile
    await setDoc(doc(db, 'profile', 'general'), DEFAULT_PROFILE);

    // 2. About
    await setDoc(doc(db, 'about', 'general'), DEFAULT_ABOUT);

    // 3. Stats
    for (const stat of DEFAULT_STATISTICS) {
      await setDoc(doc(db, 'statistics', stat.id), stat);
    }

    // 4. Skills
    for (const skill of DEFAULT_SKILLS) {
      await setDoc(doc(db, 'skills', skill.id), skill);
    }

    // 5. Services
    for (const serv of DEFAULT_SERVICES) {
      await setDoc(doc(db, 'services', serv.id), serv);
    }

    // 6. Projects
    for (const proj of DEFAULT_PROJECTS) {
      await setDoc(doc(db, 'projects', proj.id), proj);
    }

    // 7. Experiences
    for (const exp of DEFAULT_EXPERIENCES) {
      await setDoc(doc(db, 'experiences', exp.id), exp);
    }

    // 8. Education
    for (const edu of DEFAULT_EDUCATION) {
      await setDoc(doc(db, 'education', edu.id), edu);
    }

    // 9. Certifications
    for (const cert of DEFAULT_CERTIFICATIONS) {
      await setDoc(doc(db, 'certifications', cert.id), cert);
    }

    // 10. Testimonials
    for (const test of DEFAULT_TESTIMONIALS) {
      await setDoc(doc(db, 'testimonials', test.id), test);
    }

    // 11. Clients
    for (const cl of DEFAULT_CLIENTS) {
      await setDoc(doc(db, 'clients', cl.id), cl);
    }

    // 12. Social Links
    for (const soc of DEFAULT_SOCIAL_LINKS) {
      await setDoc(doc(db, 'socialLinks', soc.id), soc);
    }

    // 13. Settings
    await setDoc(doc(db, 'settings', 'general'), DEFAULT_SETTINGS);

    showAdminToast('All portfolio collections seeded successfully!', 'success');
    switchView(currentView);
  } catch (err) {
    showAdminToast('Seeding error: ' + err.message, 'error');
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return isoStr;
  }
}

export function showAdminToast(message, type = 'success') {
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
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

// Expose globally for inline button onclick attributes
window.switchView = switchView;
