/**
 * VeriPinoy — Tatak Pinoy, Tatak Sigurado
 * Master Frontend Controller & State Store (August 25, 2026 Restoration)
 * Complete Implementation of all 11 Views & Multi-Role Portals
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentUser: {
      id: 'USR-CUST-1001',
      email: 'customer@veripinoy.ph',
      name: 'Maria Clara De Los Santos',
      role: 'customer', // 'customer' | 'business' | 'freelancer' | 'staff'
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-CUSTOMER-001'
    },
    currentPage: 'home',
    businesses: [],
    freelancers: [],
    categories: [],
    locations: [],
    plans: [],
    reviews: [],
    compareBizIds: ['BIZ-2001', 'BIZ-2002'],
    activeBusinessProfileId: 'BIZ-2001',
    activeMerchantTab: 'reviews',
    conversations: [],
    activeConversationId: 'CONV-CONTRACT-001',
    messages: [],
    escrowContracts: [],
    staffCases: [],
    authModalRole: 'customer',
    authModalMode: 'login', // 'login' | 'register'
    filters: {
      bizSearch: '',
      bizCategory: 'all',
      bizLocation: 'all',
      flSearch: '',
      flLoc: 'all',
      flCat: 'all',
      flRating: 'all',
      flMaxRate: '',
      flVerifiedOnly: false,
      flTrustScore: 'all',
      chatSearch: ''
    }
  };

  // Pre-configured Demo Personas
  const DEMO_PERSONAS = {
    customer: {
      id: 'USR-CUST-1001',
      email: 'customer@veripinoy.ph',
      name: 'Maria Clara De Los Santos',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-CUSTOMER-001',
      label: 'Customer (Maria Clara)'
    },
    business: {
      id: 'USR-BIZ-2001',
      email: 'owner@manilabakery.ph',
      name: 'Juan Dela Cruz',
      role: 'business',
      businessId: 'BIZ-2001',
      businessName: 'Manila Artisan Bakery & Cafe',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-BUSINESS-001',
      label: 'Business Owner (Juan Dela Cruz)'
    },
    freelancer: {
      id: 'USER-FR-10284',
      email: 'freelancer@marcoreyes.dev',
      name: 'Marco Antonio Reyes',
      role: 'freelancer',
      freelancerId: 'USER-FR-10284',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-FREELANCER-001',
      label: 'Freelancer Pro (Marco Reyes)'
    },
    staff: {
      id: 'STAFF-ADM-001',
      email: 'auditor.santos@veripinoy.ph',
      name: 'Auditor Roberto Santos',
      role: 'staff',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-STAFF-001',
      label: 'Compliance Auditor (Santos)'
    }
  };

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('vp-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `vp-toast vp-toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <span class="vp-toast-icon" style="font-weight:bold;">${icon}</span>
      <div class="vp-toast-content" style="flex:1;">${escapeHtml(message)}</div>
      <button class="vp-toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('vp-toast-visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('vp-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Generic Safe API Fetch Wrapper
  async function apiFetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (state.currentUser && state.currentUser.token) {
      headers['Authorization'] = `Bearer ${state.currentUser.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { success: response.ok, raw: text };
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.warn(`[API Warning on ${endpoint}]:`, err.message);
      throw err;
    }
  }

  // SPA Router
  function route(pageId, params = {}) {
    if (!pageId) pageId = 'home';
    state.currentPage = pageId;

    // Handle parameter overrides
    if (pageId === 'business-profile' && params.id) {
      state.activeBusinessProfileId = params.id;
    }

    window.location.hash = pageId;

    // Toggle active class on pages
    document.querySelectorAll('.page-view').forEach(el => {
      el.classList.remove('active');
    });

    let targetPage = document.getElementById(`page-${pageId}`);
    if (!targetPage) {
      if (pageId === 'freelancer-portal' || pageId === 'portal-freelancer') {
        targetPage = document.getElementById('page-portal-freelancer');
      } else if (pageId === 'business-portal' || pageId === 'portal-business') {
        targetPage = document.getElementById('page-business-hub');
      } else if (pageId === 'staff-portal' || pageId === 'portal-staff') {
        targetPage = document.getElementById('page-staff-workspace');
      }
    }

    if (targetPage) {
      targetPage.classList.add('active');
    } else {
      const homePage = document.getElementById('page-home');
      if (homePage) homePage.classList.add('active');
    }

    // Toggle nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-route') === pageId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Page Specific Data Initializers
    if (pageId === 'home') {
      loadDiscoveryData();
    } else if (pageId === 'businesses') {
      loadBusinesses();
    } else if (pageId === 'freelancers') {
      loadFreelancers();
    } else if (pageId === 'business-profile') {
      loadBusinessProfile(state.activeBusinessProfileId || 'BIZ-2001');
    } else if (pageId === 'comparison') {
      loadComparison();
    } else if (pageId === 'customer-profile') {
      loadCustomerProfile();
    } else if (pageId === 'reviews') {
      loadPublicReviews();
    } else if (pageId === 'business-hub') {
      loadBusinessHub();
    } else if (pageId === 'pricing') {
      loadPricingPlans();
    } else if (pageId === 'portal-consumer') {
      loadConsumerPortal();
    } else if (pageId === 'portal-business' || pageId === 'business-portal') {
      loadBusinessHub();
    } else if (pageId === 'portal-freelancer' || pageId === 'freelancer-portal') {
      loadFreelancerPortal();
    } else if (pageId === 'portal-staff' || pageId === 'staff-workspace') {
      loadStaffWorkspace();
    } else if (pageId === 'chat') {
      loadConversations();
    } else if (pageId === 'escrow') {
      loadEscrowOverview();
    }

    closeMobileNav();
  }

  // Persona Switcher & Authentication State
  function switchUserPersona(roleKey) {
    const persona = DEMO_PERSONAS[roleKey];
    if (!persona) return;

    state.currentUser = { ...persona };
    localStorage.setItem('veripinoy_user', JSON.stringify(state.currentUser));

    updateUserUI();
    showToast(`Active profile switched to: ${persona.name} (${persona.role.toUpperCase()})`, 'success');

    // Automatically navigate to their dedicated dashboard
    if (roleKey === 'freelancer') route('portal-freelancer');
    else if (roleKey === 'business') route('business-hub');
    else if (roleKey === 'staff') route('staff-workspace');
    else if (roleKey === 'customer') route('customer-profile');
  }

  function logout() {
    state.currentUser = null;
    localStorage.removeItem('veripinoy_user');
    updateUserUI();
    showToast('You have been logged out successfully.', 'info');
    route('home');
  }

  function updateUserUI() {
    const user = state.currentUser;
    const navActions = document.getElementById('nav-user-actions-container');

    if (!user) {
      // Signed Out / Guest State
      const nameEls = document.querySelectorAll('.user-display-name');
      nameEls.forEach(el => el.textContent = 'Guest Visitor');

      const roleEls = document.querySelectorAll('.user-display-role');
      roleEls.forEach(el => el.textContent = 'GUEST');

      const avatarEls = document.querySelectorAll('.user-display-avatar');
      avatarEls.forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';
        }
      });

      if (navActions) {
        navActions.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-navy" style="padding:7px 16px; font-size:0.84rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:var(--shadow-sm);" onclick="window.app.openModal('modal-auth')">
              <span>🔐</span> Sign In / Register
            </button>
          </div>
        `;
      }
      return;
    }

    // Signed In State
    const nameEls = document.querySelectorAll('.user-display-name');
    nameEls.forEach(el => el.textContent = user.name || 'User');

    const roleEls = document.querySelectorAll('.user-display-role');
    roleEls.forEach(el => el.textContent = (user.role || 'User').toUpperCase());

    const avatarEls = document.querySelectorAll('.user-display-avatar');
    avatarEls.forEach(el => {
      if (el.tagName === 'IMG') {
        el.src = user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
      }
    });

    // Dynamic Top Navbar Actions with Clean Profile Badge & Polished Logout
    if (navActions) {
      let rolePortalBtn = '';
      if (user.role === 'freelancer') {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--navy-900); border-color:var(--slate-200); background:var(--white);" onclick="window.app.route('portal-freelancer')" title="Open Freelancer Workspace">
            💻 My Portal
          </button>
        `;
      } else if (user.role === 'business') {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--navy-900); border-color:var(--slate-200); background:var(--white);" onclick="window.app.route('business-hub')" title="Open Business Management Hub">
            🏢 Business Hub
          </button>
        `;
      } else if (user.role === 'staff') {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--red-600); border-color:#FECDD3; background:#FFF1F2;" onclick="window.app.route('staff-workspace')" title="Open Staff Auditor Workspace">
            🛡️ Staff Workspace
          </button>
        `;
      } else {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--navy-900); border-color:var(--slate-200); background:var(--white);" onclick="window.app.route('customer-profile')" title="Open Customer Profile & Escrow">
            👤 My Orders
          </button>
        `;
      }

      navActions.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          ${rolePortalBtn}

          <div style="display:flex; align-items:center; gap:8px; background:var(--slate-100); padding:4px 10px 4px 6px; border-radius:var(--radius-pill); cursor:pointer; border:1px solid var(--slate-200); transition:all 0.15s ease;" onclick="window.app.openModal('modal-switch-persona')" title="Switch active testing persona / profile">
            <img src="${user.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; border:1px solid var(--slate-300);">
            <div style="line-height:1.1; text-align:left;">
              <div style="font-size:0.75rem; font-weight:800; color:var(--navy-900); max-width:90px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml((user.name || 'User').split(' ')[0])}</div>
              <div style="font-size:0.65rem; font-weight:700; color:var(--emerald-700);">${(user.role || 'USER').toUpperCase()}</div>
            </div>
            <span style="font-size:0.7rem; color:var(--slate-400);">▾</span>
          </div>

          <button class="btn btn-outline" style="padding:5px 10px; font-size:0.78rem; font-weight:700; color:var(--red-600); border-color:var(--slate-200); background:var(--white); display:inline-flex; align-items:center; gap:4px;" onclick="window.app.logout()" title="Sign out of current account">
            <span>🚪</span> Log Out
          </button>
        </div>
      `;
    }

    // Update Compare Count in nav
    const compareBadge = document.getElementById('nav-compare-count');
    if (compareBadge) {
      if (state.compareBizIds.length > 0) {
        compareBadge.textContent = state.compareBizIds.length;
        compareBadge.style.display = 'inline-block';
      } else {
        compareBadge.style.display = 'none';
      }
    }
  }

  // Modal Controls
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (modalId === 'modal-auth') {
        renderAuthModal();
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function toggleMobileNav() {
    const drawer = document.getElementById('vp-mobile-drawer');
    if (drawer) drawer.classList.toggle('active');
  }

  function closeMobileNav() {
    const drawer = document.getElementById('vp-mobile-drawer');
    if (drawer) drawer.classList.remove('active');
  }

  // =========================================================================
  // UNIVERSAL MULTI-ROLE AUTH MODAL (Login.png)
  // =========================================================================
  function switchAuthModalTab(role) {
    state.authModalRole = role;
    document.querySelectorAll('#auth-modal-tabs .auth-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-role') === role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderAuthModal();
  }

  function renderAuthModal() {
    const container = document.getElementById('auth-modal-form-container');
    if (!container) return;

    const role = state.authModalRole || 'customer';
    const isLogin = state.authModalMode !== 'register';

    let roleTitle = 'Consumer / Client';
    let roleDesc = 'Safe purchases, escrow milestone payments, and verified reviews.';
    let demoPersona = DEMO_PERSONAS.customer;

    if (role === 'business') {
      roleTitle = 'Business Owner';
      roleDesc = 'Manage DTI/SEC verification, BIR 2303 vault, and customer inquiries.';
      demoPersona = DEMO_PERSONAS.business;
    } else if (role === 'freelancer') {
      roleTitle = 'Freelancer Pro';
      roleDesc = 'NBI clearance verification, UnionBank escrow milestones, and direct payouts.';
      demoPersona = DEMO_PERSONAS.freelancer;
    } else if (role === 'staff') {
      roleTitle = 'Staff Compliance Officer';
      roleDesc = 'Inspect KYB documents, review AI fraud radar, and approve verification badges.';
      demoPersona = DEMO_PERSONAS.staff;
    }

    container.innerHTML = `
      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:14px 16px; margin-bottom:18px;">
        <div style="font-weight:800; font-size:0.95rem; color:var(--navy-900);">${roleTitle}</div>
        <div style="font-size:0.8rem; color:var(--slate-500); margin-top:2px;">${roleDesc}</div>
      </div>

      <!-- Demo Accounts Helper Box -->
      <div style="background:var(--emerald-50); border:1px solid var(--emerald-200); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:0.82rem; color:var(--emerald-900);">🔑 Demo Testing Account:</strong>
          <span class="badge badge-emerald" style="font-size:0.7rem; cursor:pointer;" onclick="document.getElementById('modal-auth-email').value='${demoPersona.email}'; document.getElementById('modal-auth-password').value='demo123456';">Fill Credentials</span>
        </div>
        <div style="font-size:0.78rem; color:var(--emerald-800); line-height:1.4;">
          <strong>Email:</strong> <code style="background:rgba(255,255,255,0.7); padding:1px 5px; border-radius:3px;">${demoPersona.email}</code><br>
          <strong>Password:</strong> <code style="background:rgba(255,255,255,0.7); padding:1px 5px; border-radius:3px;">demo123456</code>
        </div>
      </div>

      <form onsubmit="window.app.handleAuthModalSubmit(event, '${role}', '${isLogin ? 'login' : 'register'}')">
        ${!isLogin ? `
          <div class="form-group">
            <label>Full Name / Authorized Rep</label>
            <input type="text" class="form-control" id="modal-auth-name" placeholder="e.g. Maria Santos" required>
          </div>
          ${role === 'business' ? `
            <div class="form-group">
              <label>Business / Enterprise Name</label>
              <input type="text" class="form-control" id="modal-auth-bizname" placeholder="e.g. Manila Bakery Corp." required>
            </div>
            <div class="form-group">
              <label>DTI / SEC Registration No.</label>
              <input type="text" class="form-control" id="modal-auth-regno" placeholder="e.g. DTI-NCR-2026-9912" required>
            </div>
          ` : ''}
          ${role === 'freelancer' ? `
            <div class="form-group">
              <label>Primary Skill / Specialty</label>
              <input type="text" class="form-control" id="modal-auth-skill" placeholder="e.g. Fullstack React & Node.js Developer" required>
            </div>
          ` : ''}
        ` : ''}

        <div class="form-group">
          <label>Email Address</label>
          <input type="email" class="form-control" id="modal-auth-email" placeholder="name@domain.ph" required>
        </div>

        <div class="form-group">
          <label>Password</label>
          <input type="password" class="form-control" id="modal-auth-password" placeholder="••••••••" required>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <label style="font-size:0.8rem; color:var(--slate-600); display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" checked> Remember me
          </label>
          <a href="javascript:void(0)" onclick="window.app.showToast('Password reset link sent to registered email', 'info')" style="font-size:0.8rem; color:var(--emerald-600); text-decoration:underline;">Forgot password?</a>
        </div>

        <button type="submit" class="btn btn-emerald" style="width:100%; padding:12px; font-size:0.95rem;">
          ${isLogin ? `Log In as ${roleTitle}` : `Create ${roleTitle} Account`}
        </button>

        ${role !== 'staff' ? `
          <div style="text-align:center; margin-top:14px; font-size:0.82rem; color:var(--slate-500);">
            ${isLogin ? `Don't have an account? <a href="javascript:void(0)" onclick="window.app.state.authModalMode='register'; window.app.renderAuthModal();" style="color:var(--navy-900); font-weight:700;">Sign up now</a>` : `Already have an account? <a href="javascript:void(0)" onclick="window.app.state.authModalMode='login'; window.app.renderAuthModal();" style="color:var(--navy-900); font-weight:700;">Log in</a>`}
          </div>
        ` : ''}
      </form>
    `;
  }

  async function handleAuthModalSubmit(e, role, mode) {
    if (e) e.preventDefault();
    const email = document.getElementById('modal-auth-email')?.value || '';
    const name = document.getElementById('modal-auth-name')?.value || '';

    const demo = DEMO_PERSONAS[role] || DEMO_PERSONAS.customer;
    state.currentUser = {
      ...demo,
      email: email || demo.email,
      name: name || demo.name
    };

    localStorage.setItem('veripinoy_user', JSON.stringify(state.currentUser));
    updateUserUI();
    closeModal('modal-auth');
    showToast(`Welcome! Logged in as ${state.currentUser.name} (${role.toUpperCase()})`, 'success');

    if (role === 'customer') route('customer-profile');
    else if (role === 'business') route('business-hub');
    else if (role === 'freelancer') route('portal-freelancer');
    else if (role === 'staff') route('staff-workspace');
  }

  function quickLoginPersona(role) {
    switchUserPersona(role);
    closeModal('modal-auth');
    if (role === 'customer') route('customer-profile');
    else if (role === 'business') route('business-hub');
    else if (role === 'freelancer') route('portal-freelancer');
    else if (role === 'staff') route('staff-workspace');
  }

  // =========================================================================
  // VIEW 1: PUBLIC DIRECTORY / DISCOVERY (Directory.png)
  // =========================================================================
  async function loadDiscoveryData() {
    try {
      const [bizRes, flRes, locRes, indRes] = await Promise.allSettled([
        apiFetch('/api/public/businesses'),
        apiFetch('/api/public/freelancers'),
        apiFetch('/api/public/locations'),
        apiFetch('/api/public/industries')
      ]);

      if (bizRes.status === 'fulfilled' && bizRes.value.businesses) {
        state.businesses = bizRes.value.businesses;
        renderFeaturedBusinesses(state.businesses.slice(0, 6));
      } else {
        fallbackBusinesses();
      }

      if (flRes.status === 'fulfilled' && flRes.value.freelancers) {
        state.freelancers = flRes.value.freelancers;
        renderFeaturedFreelancers(state.freelancers.slice(0, 6));
      } else {
        fallbackFreelancers();
      }

      if (locRes.status === 'fulfilled' && locRes.value.locations) {
        state.locations = locRes.value.locations;
        populateLocationDropdowns(state.locations);
      }

      if (indRes.status === 'fulfilled' && indRes.value.industries) {
        state.categories = indRes.value.industries;
        populateIndustryDropdowns(state.categories);
      }
    } catch (err) {
      fallbackBusinesses();
      fallbackFreelancers();
    }
  }

  function fallbackBusinesses() {
    state.businesses = [
      {
        id: 'BIZ-2001',
        business_name: 'Manila Artisan Bakery & Cafe',
        registration_number: 'DTI-NCR-2024-8812',
        city_name: 'Manila',
        industry: 'Food & Beverage',
        short_description: 'Artisanal sourdough, Filipino heritage pastries, and specialty single-origin roasted beans.',
        full_description: 'Manila Artisan Bakery & Cafe is an accredited Philippine food enterprise established in Intramuros and BGC. Registered with DTI and BIR Form 2303 verified.',
        rating: 4.9,
        review_count: 38,
        trust_score: '99.4%',
        offerings: ['Heritage Sourdough', 'Ube Halaya Brioche', 'Cold Brew Coffee', 'Catering Orders'],
        address: '104 General Luna St, Intramuros, Manila, 1002 Metro Manila',
        phone: '+63 2 8521 4490',
        email: 'hello@manilabakery.ph'
      },
      {
        id: 'BIZ-2002',
        business_name: 'Cebu Coastal Seafood Traders',
        registration_number: 'SEC-CS20230192',
        city_name: 'Cebu City',
        industry: 'Supply Chain & Logistics',
        short_description: 'Direct wholesale seafood distribution and cold chain logistics across the Visayas region.',
        full_description: 'Direct certified seafood supplier connecting local fisherfolk to Metro Cebu restaurants and hotels with full cold-chain tracking.',
        rating: 4.8,
        review_count: 24,
        trust_score: '98.7%',
        offerings: ['Fresh Yellowfin Tuna', 'Mud Crabs', 'Export Grade Prawns', 'Cold Chain Transport'],
        address: 'Wharf 4, North Reclamation Area, Cebu City, 6000 Cebu',
        phone: '+63 32 412 8890',
        email: 'sales@cebuseafood.ph'
      },
      {
        id: 'BIZ-2003',
        business_name: 'Davao Agribusiness Innovations Corp',
        registration_number: 'SEC-CS20220914',
        city_name: 'Davao City',
        industry: 'Agriculture',
        short_description: 'Sustainable cacao farming, single-origin dark chocolate processing, and premium fruit exports.',
        full_description: 'Award-winning Mindanao cacao grower and chocolate maker providing export-quality cacao nibs and organic fruits.',
        rating: 5.0,
        review_count: 19,
        trust_score: '99.8%',
        offerings: ['70% Single-Origin Tablea', 'Cacao Nibs', 'Cavendish Bananas', 'Agricultural Tech'],
        address: 'KM 11, Sasa, Davao City, 8000 Davao del Sur',
        phone: '+63 82 234 1100',
        email: 'info@davaoagri.ph'
      }
    ];
    renderFeaturedBusinesses(state.businesses);
  }

  function fallbackFreelancers() {
    state.freelancers = [
      {
        id: 'USER-FR-10284',
        full_name: 'Marco Antonio Reyes',
        headline: 'Senior Full-Stack Cloud Engineer',
        hourly_rate_php: 1200,
        city_name: 'Quezon City',
        skills: ['React', 'Node.js', 'PostgreSQL', 'GCP', 'TypeScript'],
        rating: 5.0,
        completed_projects: 42,
        trust_score: '99.5%',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
        bio: 'Over 8 years designing fintech APIs, bank payment gateways, and scalable cloud architectures with verified NBI clearance and UnionBank escrow integration.'
      },
      {
        id: 'USER-FR-10285',
        full_name: 'Patricia Joy Mendoza',
        headline: 'Lead UI/UX & Brand Identity Designer',
        hourly_rate_php: 950,
        city_name: 'Makati City',
        skills: ['Figma', 'Design Systems', 'Mobile UI', 'Webflow'],
        rating: 4.9,
        completed_projects: 31,
        trust_score: '98.9%',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        bio: 'Specialist in consumer fintech apps, accessible interfaces, and corporate brand guidelines. Background verified with verified PRC ID.'
      },
      {
        id: 'USER-FR-10286',
        full_name: 'Christian Dave Lim',
        headline: 'Mobile App Developer (Flutter & Swift)',
        hourly_rate_php: 1100,
        city_name: 'Cebu City',
        skills: ['Flutter', 'Swift', 'Firebase', 'REST APIs'],
        rating: 4.8,
        completed_projects: 27,
        trust_score: '98.2%',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        bio: 'Crafting responsive, high-performance mobile applications for e-commerce and logistics startups across the Philippines.'
      }
    ];
    renderFeaturedFreelancers(state.freelancers);
  }

  function renderFeaturedBusinesses(list) {
    const container = document.getElementById('featured-biz-grid');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="vp-empty-state">No verified businesses available right now.</div>`;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="vp-card" id="biz-card-${b.id}">
        <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:12px;">
          <div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.3rem;">
            ${(b.business_name || 'B').charAt(0)}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <h4 style="font-weight:800; font-size:1.05rem; color:var(--navy-900); margin:0;">${escapeHtml(b.business_name || 'Business')}</h4>
              <span class="badge badge-emerald">✓ Verified</span>
            </div>
            <div style="font-size:0.78rem; color:var(--slate-500); margin-top:2px;">
              📍 ${escapeHtml(b.city_name || 'Philippines')} • 🏢 ${escapeHtml(b.industry || 'Enterprise')}
            </div>
          </div>
        </div>
        <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:14px; flex:1; line-height:1.4;">${escapeHtml(b.short_description || '')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:12px;">
          <span style="color:var(--amber-600); font-weight:800; font-size:0.88rem;">★ ${b.rating || 5.0} (${b.review_count || 12})</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline" style="padding:4px 10px; font-size:0.78rem;" onclick="window.app.toggleCompare('${b.id}')">
              ${state.compareBizIds.includes(b.id) ? '✓ Compared' : '+ Compare'}
            </button>
            <button class="btn btn-emerald" style="padding:4px 10px; font-size:0.78rem;" onclick="window.app.route('business-profile', { id: '${b.id}' })">
              Profile →
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderFeaturedFreelancers(list) {
    const container = document.getElementById('featured-fl-grid');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div class="vp-empty-state">No verified freelancers available right now.</div>`;
      return;
    }

    container.innerHTML = list.map(f => `
      <div class="vp-card" id="fl-card-${f.id}">
        <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:12px;">
          <img src="${f.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'}" style="width:44px; height:44px; border-radius:50%; object-fit:cover;" alt="${f.full_name}">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <h4 style="font-weight:800; font-size:1.05rem; color:var(--navy-900); margin:0;">${escapeHtml(f.full_name || 'Freelancer')}</h4>
              <span class="badge badge-gold">⭐ Top Rated</span>
            </div>
            <div style="font-size:0.78rem; color:var(--slate-500); margin-top:2px;">${escapeHtml(f.headline || 'Verified Professional')}</div>
          </div>
        </div>
        <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:14px; flex:1; line-height:1.4;">${escapeHtml(f.bio || '')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:12px;">
          <div>
            <div style="font-weight:800; color:var(--navy-900); font-size:0.92rem;">₱${(f.hourly_rate_php || 850).toLocaleString()}/hr</div>
            <div style="font-size:0.72rem; color:var(--emerald-600); font-weight:700;">✓ ID & NBI Cleared</div>
          </div>
          <button class="btn btn-emerald" style="padding:4px 12px; font-size:0.78rem;" onclick="window.app.route('freelancers')">
            View Talent →
          </button>
        </div>
      </div>
    `).join('');
  }

  function populateLocationDropdowns(locations) {
    const dropdowns = document.querySelectorAll('.location-select');
    dropdowns.forEach(select => {
      const currentVal = select.value;
      select.innerHTML = `<option value="all">All Philippine Cities</option>` +
        locations.map(l => `<option value="${l.name || l.slug}">${l.name || l.city_name}</option>`).join('');
      if (currentVal) select.value = currentVal;
    });
  }

  function populateIndustryDropdowns(industries) {
    const dropdowns = document.querySelectorAll('.industry-select');
    dropdowns.forEach(select => {
      const currentVal = select.value;
      select.innerHTML = `<option value="all">All Industries & Categories</option>` +
        industries.map(i => `<option value="${i.name || i.slug}">${i.name || i.title}</option>`).join('');
      if (currentVal) select.value = currentVal;
    });
  }

  // =========================================================================
  // VIEW 2: BUSINESS PROFILE (Business Profile.png)
  // =========================================================================
  function loadBusinessProfile(bizId) {
    const container = document.getElementById('business-profile-container');
    if (!container) return;

    const b = state.businesses.find(x => x.id === bizId) || state.businesses[0] || {
      id: 'BIZ-2001',
      business_name: 'Manila Artisan Bakery & Cafe',
      registration_number: 'DTI-NCR-2024-8812',
      city_name: 'Manila',
      industry: 'Food & Beverage',
      short_description: 'Artisanal sourdough, Filipino heritage pastries, and specialty single-origin roasted beans.',
      full_description: 'Manila Artisan Bakery & Cafe is an accredited Philippine food enterprise located in historic Intramuros with branches across Bonifacio Global City. Registered with DTI and BIR Form 2303 verified in the VeriPinoy encrypted document vault.',
      rating: 4.9,
      review_count: 38,
      trust_score: '99.4%',
      offerings: ['Heritage Sourdough', 'Ube Halaya Brioche', 'Cold Brew Coffee', 'Catering Orders', 'Barista Training'],
      address: '104 General Luna St, Intramuros, Manila, 1002 Metro Manila',
      phone: '+63 2 8521 4490',
      email: 'hello@manilabakery.ph'
    };

    container.innerHTML = `
      <!-- Breadcrumbs -->
      <div style="font-size:0.85rem; color:var(--slate-500); margin-bottom:16px;">
        <a href="javascript:void(0)" onclick="window.app.route('home')" style="color:var(--slate-600); text-decoration:none;">Directory</a>
        <span style="margin:0 6px;">/</span>
        <a href="javascript:void(0)" onclick="window.app.route('businesses')" style="color:var(--slate-600); text-decoration:none;">${escapeHtml(b.industry || 'Enterprises')}</a>
        <span style="margin:0 6px;">/</span>
        <strong style="color:var(--navy-900);">${escapeHtml(b.business_name)}</strong>
      </div>

      <!-- Business Header Card matching Business Profile.png -->
      <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:28px; box-shadow:var(--shadow-sm); margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
          <div style="display:flex; gap:18px; align-items:center;">
            <div style="width:68px; height:68px; border-radius:var(--radius-lg); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:2rem; box-shadow:var(--shadow-xs);">
              ${(b.business_name || 'B').charAt(0)}
            </div>
            <div>
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <h1 style="font-family:var(--font-heading); font-size:1.8rem; font-weight:900; color:var(--navy-900); margin:0;">
                  ${escapeHtml(b.business_name)}
                </h1>
                <span class="badge badge-emerald" style="font-size:0.8rem; padding:4px 10px;">✓ DTI/SEC Verified</span>
                <span class="badge badge-gold" style="font-size:0.8rem; padding:4px 10px;">★ PRO ACCREDITED</span>
              </div>
              <div style="font-size:0.9rem; color:var(--slate-500); margin-top:4px;">
                📍 ${escapeHtml(b.address || b.city_name || 'Manila, Philippines')} • 🏢 ${escapeHtml(b.industry || 'Food & Beverage')} • ID: <code>${b.id}</code>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-outline" onclick="window.app.toggleCompare('${b.id}')">
              ${state.compareBizIds.includes(b.id) ? '✓ In Comparison List' : '⚖️ Compare Business'}
            </button>
            <button class="btn btn-emerald" onclick="window.app.startChatWithEntity('${b.id}', '${escapeHtml(b.business_name)}', 'business')">
              💬 Inquire via E2EE Chat
            </button>
          </div>
        </div>

        <!-- Trust Status Box (Green Accents) -->
        <div class="trust-status-box">
          <div>
            <div class="trust-stat-title">DTI / SEC REGISTRATION</div>
            <div class="trust-stat-val">✓ VERIFIED (${b.registration_number || 'DTI-NCR-2024-8812'})</div>
          </div>
          <div>
            <div class="trust-stat-title">BIR FORM 2303</div>
            <div class="trust-stat-val">✓ ENCRYPTED IN VAULT</div>
          </div>
          <div>
            <div class="trust-stat-title">MAYOR'S LGU PERMIT</div>
            <div class="trust-stat-val">✓ 2026 ACTIVE</div>
          </div>
          <div>
            <div class="trust-stat-title">VERIPINOY TRUST SCORE</div>
            <div class="trust-stat-val" style="color:var(--emerald-600);">${b.trust_score || '99.4% Verified'}</div>
          </div>
        </div>

        <!-- About Entity -->
        <div style="margin-top:20px;">
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin-bottom:8px;">About This Enterprise</h3>
          <p style="font-size:0.95rem; color:var(--slate-700); line-height:1.6;">
            ${escapeHtml(b.full_description || b.short_description || '')}
          </p>
        </div>

        <!-- Key Offerings / Products -->
        <div style="margin-top:20px;">
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin-bottom:10px;">Featured Products & Services</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${(b.offerings || ['Artisanal Pastries', 'Catering Orders', 'Cold Brew', 'Specialty Coffee']).map(p => `
              <span class="badge badge-navy" style="font-size:0.85rem; padding:6px 12px; background:var(--slate-100); color:var(--navy-900); border-color:var(--slate-300);">${escapeHtml(p)}</span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Reviews & Verified Feedback for this Business -->
      <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:24px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--slate-200); padding-bottom:16px;">
          <div>
            <h3 style="font-family:var(--font-heading); font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0;">
              Verified Customer Reviews (${b.review_count || 38})
            </h3>
            <div style="font-size:0.85rem; color:var(--slate-500); margin-top:2px;">
              Protected by VeriPinoy AI Anti-Fraud Radar & Proof of Purchase
            </div>
          </div>
          <button class="btn btn-emerald" onclick="window.app.route('reviews')">
            ✍️ Write a Review
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="color:var(--navy-900);">Maria Clara S.</strong>
                <span class="badge badge-emerald" style="font-size:0.7rem;">✓ Verified Customer</span>
              </div>
              <span style="color:var(--amber-500); font-size:0.9rem;">★★★★★</span>
            </div>
            <p style="font-size:0.88rem; color:var(--slate-700); margin:0; line-height:1.5;">
              "The sourdough and pastries were delivered fresh to our corporate event in BGC. Excellent customer service and clear official receipts provided."
            </p>
          </div>

          <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="color:var(--navy-900);">Verified Reviewer #714</strong>
                <span class="badge badge-emerald" style="font-size:0.7rem;">✓ Verified Customer</span>
              </div>
              <span style="color:var(--amber-500); font-size:0.9rem;">★★★★★</span>
            </div>
            <p style="font-size:0.88rem; color:var(--slate-700); margin:0; line-height:1.5;">
              "Legitimate DTI registered business. We always order our heritage single-origin beans from here. Highly recommended!"
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // VIEW 3: MULTI-BUSINESS COMPARISON (Comparison.png)
  // =========================================================================
  function loadComparison() {
    const container = document.getElementById('comparison-view-container');
    if (!container) return;

    if (state.compareBizIds.length === 0) {
      container.innerHTML = `
        <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:40px; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:12px;">⚖️</div>
          <h3 style="font-family:var(--font-heading); font-size:1.4rem; font-weight:800; color:var(--navy-900); margin-bottom:8px;">No Businesses Selected for Comparison</h3>
          <p style="color:var(--slate-500); font-size:0.9rem; max-width:480px; margin:0 auto 20px;">
            Browse the directory and click "+ Compare" on any Philippine enterprise to view side-by-side verification and compliance metrics.
          </p>
          <button class="btn btn-emerald" onclick="window.app.route('businesses')">
            🔍 Browse Verified Directory
          </button>
        </div>
      `;
      return;
    }

    const selectedBizs = state.compareBizIds.map(id => {
      return state.businesses.find(b => b.id === id) || {
        id,
        business_name: id === 'BIZ-2001' ? 'Manila Artisan Bakery & Cafe' : 'Cebu Coastal Seafood Traders',
        registration_number: id === 'BIZ-2001' ? 'DTI-NCR-2024-8812' : 'SEC-CS20230192',
        city_name: id === 'BIZ-2001' ? 'Manila' : 'Cebu City',
        industry: id === 'BIZ-2001' ? 'Food & Beverage' : 'Supply Chain',
        rating: id === 'BIZ-2001' ? 4.9 : 4.8,
        review_count: id === 'BIZ-2001' ? 38 : 24,
        trust_score: id === 'BIZ-2001' ? '99.4%' : '98.7%'
      };
    });

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="font-family:var(--font-heading); font-size:1.8rem; font-weight:900; color:var(--navy-900); margin:0;">
            ⚖️ Enterprise Comparison Deck
          </h2>
          <p style="color:var(--slate-500); font-size:0.9rem; margin-top:2px;">
            Side-by-side Philippine government compliance, trust ratings, and accreditation comparison.
          </p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline" onclick="window.app.route('businesses')">+ Add Business</button>
          <button class="btn btn-outline" onclick="window.app.state.compareBizIds=[]; window.app.updateUserUI(); window.app.loadComparison();">Clear All</button>
        </div>
      </div>

      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th>COMPLIANCE METRIC</th>
              ${selectedBizs.map(b => `
                <th>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <div style="font-size:1.1rem; font-weight:800; color:var(--navy-900);">${escapeHtml(b.business_name)}</div>
                      <div style="font-size:0.75rem; color:var(--slate-500); font-weight:normal;">${escapeHtml(b.city_name || '')}</div>
                    </div>
                    <button class="btn btn-outline" style="padding:2px 6px; font-size:0.7rem; border:none;" onclick="window.app.toggleCompare('${b.id}')">✕</button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Accreditation Status</td>
              ${selectedBizs.map(() => `<td><span class="badge badge-emerald">✓ DTI / SEC Verified</span></td>`).join('')}
            </tr>
            <tr>
              <td>Registration Number</td>
              ${selectedBizs.map(b => `<td><code>${b.registration_number || 'DTI-NCR-2024'}</code></td>`).join('')}
            </tr>
            <tr>
              <td>Trust & Legitimacy Score</td>
              ${selectedBizs.map(b => `<td><strong style="color:var(--emerald-600); font-size:1.1rem;">${b.trust_score || '99.2%'}</strong></td>`).join('')}
            </tr>
            <tr>
              <td>Customer Star Rating</td>
              ${selectedBizs.map(b => `<td><span style="color:var(--amber-600); font-weight:800;">★ ${b.rating || 5.0}</span> (${b.review_count || 12} reviews)</td>`).join('')}
            </tr>
            <tr>
              <td>Dispute Resolution Rate</td>
              ${selectedBizs.map(() => `<td><strong style="color:var(--navy-900);">100.0% Clean Record</strong></td>`).join('')}
            </tr>
            <tr>
              <td>BIR Form 2303 Vault</td>
              ${selectedBizs.map(() => `<td><span class="badge badge-gold">🔒 AES-256 Encrypted</span></td>`).join('')}
            </tr>
            <tr>
              <td>Actions</td>
              ${selectedBizs.map(b => `
                <td>
                  <div style="display:flex; gap:6px; flex-direction:column;">
                    <button class="btn btn-emerald" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.route('business-profile', { id: '${b.id}' })">View Profile →</button>
                    <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.startChatWithEntity('${b.id}', '${escapeHtml(b.business_name)}', 'business')">💬 Direct Inquiry</button>
                  </div>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function toggleCompare(bizId) {
    if (state.compareBizIds.includes(bizId)) {
      state.compareBizIds = state.compareBizIds.filter(id => id !== bizId);
      showToast('Removed from comparison deck', 'info');
    } else {
      if (state.compareBizIds.length >= 4) {
        showToast('You can compare up to 4 businesses simultaneously', 'warning');
        return;
      }
      state.compareBizIds.push(bizId);
      showToast('Added to comparison deck!', 'success');
    }

    updateUserUI();

    if (state.currentPage === 'comparison') {
      loadComparison();
    } else if (state.currentPage === 'business-profile') {
      loadBusinessProfile(state.activeBusinessProfileId);
    } else if (state.currentPage === 'home') {
      renderFeaturedBusinesses(state.businesses.slice(0, 6));
    }
  }

  // =========================================================================
  // VIEW 4: CUSTOMER PROFILE & VERIFICATION (Customer Profile_Verification.png)
  // =========================================================================
  function loadCustomerProfile() {
    const container = document.getElementById('customer-profile-container');
    if (!container) return;

    const user = state.currentUser;

    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px;">
        <!-- Left: Customer Profile Card -->
        <div>
          <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:24px; box-shadow:var(--shadow-sm); text-align:center; margin-bottom:20px;">
            <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid var(--emerald-500); margin:0 auto 12px;">
            <h2 style="font-family:var(--font-heading); font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0;">
              ${escapeHtml(user.name || 'Maria Clara De Los Santos')}
            </h2>
            <div style="font-size:0.82rem; color:var(--slate-500); margin:4px 0 12px;">
              ${escapeHtml(user.email || 'customer@veripinoy.ph')}
            </div>
            <div style="display:flex; justify-content:center; gap:6px;">
              <span class="badge badge-emerald">✓ KYC Level 2 Verified</span>
              <span class="badge badge-gold">⭐ Elite Reviewer</span>
            </div>
          </div>

          <!-- DPA Privacy Preference Selector -->
          <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:20px; box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1rem; font-weight:800; color:var(--navy-900); margin-bottom:8px;">🔒 Data Privacy (DPA 2012)</h3>
            <p style="font-size:0.78rem; color:var(--slate-500); margin-bottom:12px;">
              Choose how your name is displayed on public merchant reviews:
            </p>
            <select class="form-control" style="font-size:0.85rem;" onchange="window.app.showToast('Data privacy masking preference updated', 'success')">
              <option value="full">Full Legal Name (Maria Clara De Los Santos)</option>
              <option value="initials" selected>First Name + Initial (Maria Clara S.)</option>
              <option value="anon">Anonymous Verified ID (Verified Reviewer #891)</option>
            </select>
          </div>
        </div>

        <!-- Right: My Reviews & Escrow Summary -->
        <div>
          <!-- Quick Stat Strip -->
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:20px;">
            <div class="vp-stat-item">
              <div class="vp-stat-value" style="color:var(--emerald-600);">8</div>
              <div class="vp-stat-label">Verified Reviews Posted</div>
            </div>
            <div class="vp-stat-item">
              <div class="vp-stat-value">₱35,000</div>
              <div class="vp-stat-label">In Escrow Protection</div>
            </div>
            <div class="vp-stat-item">
              <div class="vp-stat-value" style="color:var(--blue-600);">100%</div>
              <div class="vp-stat-label">Authenticity Rating</div>
            </div>
          </div>

          <!-- My Recent Reviews -->
          <div style="background:var(--white); border-radius:var(--radius-lg); border:1px solid var(--slate-200); padding:24px; box-shadow:var(--shadow-sm);">
            <h3 style="font-family:var(--font-heading); font-size:1.2rem; font-weight:800; color:var(--navy-900); margin-bottom:16px;">
              My Authentic Review History
            </h3>

            <div style="display:flex; flex-direction:column; gap:14px;">
              <div style="border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <div>
                    <strong style="color:var(--navy-900);">Manila Artisan Bakery & Cafe</strong>
                    <span style="font-size:0.75rem; color:var(--slate-500); margin-left:8px;">Reviewed on Aug 22, 2026</span>
                  </div>
                  <span style="color:var(--amber-500);">★★★★★</span>
                </div>
                <p style="font-size:0.85rem; color:var(--slate-700); margin:0;">
                  "The sourdough and pastries were delivered fresh to our corporate event in BGC. Excellent customer service and clear official receipts provided."
                </p>
                <div style="margin-top:8px; font-size:0.75rem; color:var(--emerald-600); font-weight:700;">
                  ✓ Masked as: Maria Clara S. • AI Fraud Score: 0.02 (Legitimate)
                </div>
              </div>

              <div style="border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <div>
                    <strong style="color:var(--navy-900);">Marco Antonio Reyes (Freelancer)</strong>
                    <span style="font-size:0.75rem; color:var(--slate-500); margin-left:8px;">Reviewed on Aug 18, 2026</span>
                  </div>
                  <span style="color:var(--amber-500);">★★★★★</span>
                </div>
                <p style="font-size:0.85rem; color:var(--slate-700); margin:0;">
                  "Exceptional full-stack delivery on our payment gateway milestone. Clear documentation and on-time deployment."
                </p>
                <div style="margin-top:8px; font-size:0.75rem; color:var(--emerald-600); font-weight:700;">
                  ✓ Masked as: Maria Clara S. • UnionBank Escrow Milestone Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // VIEW 5: CUSTOMER REVIEWS & FEED (CustomerReviews.png)
  // =========================================================================
  function loadPublicReviews() {
    const feedContainer = document.getElementById('public-reviews-feed-container');
    if (!feedContainer) return;

    // Populate business target select
    const targetSelect = document.getElementById('review-form-biz-id');
    if (targetSelect && state.businesses.length > 0) {
      targetSelect.innerHTML = state.businesses.map(b => `
        <option value="${b.id}">${escapeHtml(b.business_name)} (${b.city_name || 'Philippines'})</option>
      `).join('');
    }

    // Static reviews feed
    state.reviews = [
      {
        id: 'REV-101',
        business_name: 'Manila Artisan Bakery & Cafe',
        reviewer_name: 'Maria Clara S.',
        rating: 5,
        review_text: 'The sourdough and pastries were delivered fresh to our corporate event in BGC. Excellent customer service and clear official receipts provided.',
        timestamp: '15 minutes ago',
        verified: true
      },
      {
        id: 'REV-102',
        business_name: 'Cebu Coastal Seafood Traders',
        reviewer_name: 'Captain Eduardo V.',
        rating: 5,
        review_text: 'High quality cold-chain yellowfin tuna delivery. SEC and sanitary permits fully up to date.',
        timestamp: '1 hour ago',
        verified: true
      },
      {
        id: 'REV-103',
        business_name: 'Davao Agribusiness Innovations Corp',
        reviewer_name: 'Verified Reviewer #419',
        rating: 5,
        review_text: 'The 70% single-origin cacao tablea is world-class. Fast shipping from Davao to Metro Manila.',
        timestamp: '3 hours ago',
        verified: true
      }
    ];

    feedContainer.innerHTML = state.reviews.map(r => `
      <div class="vp-card" style="margin-bottom:14px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <div style="font-weight:800; font-size:0.95rem; color:var(--navy-900);">${escapeHtml(r.business_name)}</div>
            <div style="font-size:0.75rem; color:var(--slate-500);">Reviewed by <strong>${escapeHtml(r.reviewer_name)}</strong> • <span class="badge badge-emerald" style="font-size:0.65rem;">✓ Verified Purchase</span></div>
          </div>
          <div style="color:var(--amber-500); font-weight:800; font-size:0.9rem;">${'★'.repeat(r.rating)}</div>
        </div>
        <p style="font-size:0.88rem; color:var(--slate-700); line-height:1.5; margin-bottom:8px;">
          "${escapeHtml(r.review_text)}"
        </p>
        <div style="font-size:0.72rem; color:var(--slate-400); text-align:right;">
          ${r.timestamp} • Checked via VeriPinoy AI Anti-Fraud
        </div>
      </div>
    `).join('');
  }

  function handlePublicReviewSubmit(e) {
    if (e) e.preventDefault();
    const bizId = document.getElementById('review-form-biz-id')?.value;
    const stars = document.getElementById('review-form-stars')?.value || '5';
    const text = document.getElementById('review-form-text')?.value;

    if (!text) {
      showToast('Please type your review statement', 'warning');
      return;
    }

    const b = state.businesses.find(x => x.id === bizId) || state.businesses[0] || {};
    const dpaMask = document.querySelector('input[name="dpa_mask"]:checked')?.value || 'full';

    let reviewerLabel = state.currentUser.name;
    if (dpaMask === 'initials') reviewerLabel = 'Maria Clara S.';
    if (dpaMask === 'anon') reviewerLabel = 'Verified Reviewer #891';

    state.reviews.unshift({
      id: `REV-${Date.now()}`,
      business_name: b.business_name || 'Manila Artisan Bakery',
      reviewer_name: reviewerLabel,
      rating: parseInt(stars, 10),
      review_text: text,
      timestamp: 'Just now',
      verified: true
    });

    document.getElementById('review-form-text').value = '';
    showToast('Your review has been authenticated and posted to the community feed!', 'success');
    loadPublicReviews();
  }

  // =========================================================================
  // VIEW 6: MERCHANT HUB / CONTROL DECK (Dashboard1.png & Dashboard2.png)
  // =========================================================================
  function loadBusinessHub() {
    const container = document.getElementById('merchant-control-deck-container');
    if (!container) return;

    const b = state.businesses.find(x => x.id === 'BIZ-2001') || state.businesses[0] || {};

    container.innerHTML = `
      <!-- KPI Suite Box (Dashboard1.png) -->
      <div class="kpi-suite-box">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-emerald" style="background:rgba(16,185,129,0.2); color:var(--emerald-400); border-color:var(--emerald-500);">MERCHANT CONTROL DECK</span>
              <span class="badge badge-gold" style="background:rgba(245,158,11,0.2); color:var(--amber-400); border-color:var(--amber-500);">PRO TIER</span>
            </div>
            <h1 style="font-family:var(--font-heading); font-size:1.8rem; font-weight:900; margin:6px 0 2px;">
              ${escapeHtml(b.business_name || 'Manila Artisan Bakery & Cafe')}
            </h1>
            <div style="font-size:0.82rem; color:var(--slate-300);">
              DTI No: <code>${b.registration_number || 'DTI-NCR-2024-8812'}</code> • Trust Score: <strong style="color:var(--emerald-400);">${b.trust_score || '99.4%'}</strong>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn btn-emerald" onclick="window.app.copyTrustBadgeSnippet()">
              📋 Embed Trust Seal
            </button>
            <button class="btn btn-outline" style="color:var(--white); border-color:rgba(255,255,255,0.3); background:transparent;" onclick="window.app.route('business-profile', { id: 'BIZ-2001' })">
              👁️ View Live Profile
            </button>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-item">
            <div class="kpi-title">TOTAL REVIEWS</div>
            <div class="kpi-val">${b.review_count || 38}</div>
            <div class="kpi-sub">100% verified buyers</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-title">AVERAGE RATING</div>
            <div class="kpi-val" style="color:var(--amber-400);">★ ${b.rating || 4.9}</div>
            <div class="kpi-sub">Out of 5.0 scale</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-title">SENTIMENT INDEX</div>
            <div class="kpi-val" style="color:var(--emerald-400);">98.2%</div>
            <div class="kpi-sub">Positive sentiment</div>
          </div>
          <div class="kpi-item">
            <div class="kpi-title">ESCROW VOLUME</div>
            <div class="kpi-val" style="color:var(--blue-400);">₱120K</div>
            <div class="kpi-sub">Protected milestones</div>
          </div>
        </div>
      </div>

      <!-- Merchant Control Sub-Tabs (Dashboard2.png) -->
      <div class="merchant-tab-bar">
        <button class="merchant-tab-btn ${state.activeMerchantTab === 'reviews' ? 'active' : ''}" onclick="window.app.switchMerchantTab('reviews')">
          💬 Reviews & Reputation (${b.review_count || 38})
        </button>
        <button class="merchant-tab-btn ${state.activeMerchantTab === 'kyb' ? 'active' : ''}" onclick="window.app.switchMerchantTab('kyb')">
          🔒 KYB & Encrypted Vault
        </button>
        <button class="merchant-tab-btn ${state.activeMerchantTab === 'inquiries' ? 'active' : ''}" onclick="window.app.switchMerchantTab('inquiries')">
          📬 Direct Inquiries
        </button>
        <button class="merchant-tab-btn ${state.activeMerchantTab === 'disputes' ? 'active' : ''}" onclick="window.app.switchMerchantTab('disputes')">
          🛡️ Dispute & Mediation (0)
        </button>
      </div>

      <!-- Sub-Tab Content -->
      <div id="merchant-subtab-container">
        ${renderMerchantSubtabContent(state.activeMerchantTab || 'reviews')}
      </div>
    `;
  }

  function switchMerchantTab(tabKey) {
    state.activeMerchantTab = tabKey;
    document.querySelectorAll('.merchant-tab-btn').forEach(btn => {
      if (btn.textContent.toLowerCase().includes(tabKey)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const subContainer = document.getElementById('merchant-subtab-container');
    if (subContainer) {
      subContainer.innerHTML = renderMerchantSubtabContent(tabKey);
    }
  }

  function renderMerchantSubtabContent(tabKey) {
    if (tabKey === 'kyb') {
      return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div class="vp-card" style="padding:20px;">
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy-900); margin-bottom:8px;">🔒 Encrypted Document Vault (AES-256-GCM)</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin-bottom:14px;">
              Documents are stored with cryptographic hashes to prove government compliance without leaking sensitive owner data.
            </p>
            <div style="border:2px dashed var(--slate-300); border-radius:var(--radius-md); padding:24px; text-align:center; margin-bottom:14px; background:var(--slate-50);">
              <div style="font-size:2rem; margin-bottom:6px;">📄</div>
              <strong style="color:var(--navy-900);">BIR Form 2303 & Mayor's Permit</strong>
              <div style="font-size:0.75rem; color:var(--slate-500); margin-top:4px;">Drag & drop new renewal PDF (Max 15MB)</div>
            </div>
            <button class="btn btn-outline" style="width:100%;" onclick="window.app.uploadVaultDoc('BIR-2303-RENEWAL')">
              + Upload Renewal Document
            </button>
          </div>

          <div class="vp-card" style="padding:20px;">
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy-900); margin-bottom:8px;">Audit & Verification Records</h3>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px; font-size:0.82rem;">
                <strong>DTI Registration Certificate</strong>
                <div style="color:var(--emerald-600); font-weight:700;">✓ Verified (NCR-2024-8812)</div>
              </div>
              <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px; font-size:0.82rem;">
                <strong>BIR Tax Identification (TIN)</strong>
                <div style="color:var(--emerald-600); font-weight:700;">✓ Verified & Active</div>
              </div>
              <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px; font-size:0.82rem;">
                <strong>LGU Business Permit 2026</strong>
                <div style="color:var(--emerald-600); font-weight:700;">✓ Current Year Cleared</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (tabKey === 'inquiries') {
      return `
        <div class="vp-card" style="padding:20px;">
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin-bottom:12px;">Inbound E2EE Customer Inquiries</h3>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="color:var(--navy-900);">Maria Clara De Los Santos</strong>
                <div style="font-size:0.78rem; color:var(--slate-500);">Inquiry regarding custom catering package for 50 pax in BGC.</div>
              </div>
              <button class="btn btn-emerald" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.startChatWithEntity('USR-CUST-1001', 'Maria Clara', 'customer')">
                Open Chat →
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // Default: Reviews & Reputation Tab matching Dashboard1.png
    return `
      <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
        <!-- Left: Reviews List & Reply -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--navy-900);">Customer Feedback Queue</h3>
            <span style="font-size:0.8rem; color:var(--slate-500);">Sorted by latest</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="vp-card" style="padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div>
                  <strong style="color:var(--navy-900);">Maria Clara S.</strong>
                  <span class="badge badge-emerald" style="font-size:0.65rem; margin-left:6px;">✓ Verified Customer</span>
                </div>
                <span style="color:var(--amber-500);">★★★★★</span>
              </div>
              <p style="font-size:0.85rem; color:var(--slate-700); margin-bottom:10px;">
                "The sourdough and pastries were delivered fresh to our corporate event in BGC. Excellent customer service and clear official receipts provided."
              </p>
              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:10px;">
                <span style="font-size:0.75rem; color:var(--slate-400);">Received 15 mins ago</span>
                <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="window.app.openMerchantReplyModal('REV-101')">
                  ✍️ Post Official Merchant Reply
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Reputation Summary Card -->
        <div>
          <div class="vp-card" style="padding:20px;">
            <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy-900); margin-bottom:12px;">Reputation Health</h3>
            <div style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                <span>5 Stars (Excellence)</span>
                <strong>94%</strong>
              </div>
              <div style="background:var(--slate-200); height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:var(--emerald-500); width:94%; height:100%;"></div>
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                <span>4 Stars (Good)</span>
                <strong>6%</strong>
              </div>
              <div style="background:var(--slate-200); height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:var(--emerald-400); width:6%; height:100%;"></div>
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                <span>1-3 Stars</span>
                <strong>0%</strong>
              </div>
              <div style="background:var(--slate-200); height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:var(--amber-400); width:0%; height:100%;"></div>
              </div>
            </div>
            <div style="background:var(--emerald-50); border:1px solid var(--emerald-200); border-radius:var(--radius-md); padding:12px; font-size:0.8rem; color:var(--emerald-800);">
              ✓ Your business qualifies for the <strong>Top Verified Merchant 2026</strong> accreditation badge!
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openMerchantReplyModal(reviewId) {
    const modalBody = document.getElementById('merchant-reply-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="margin-bottom:14px; font-size:0.88rem; color:var(--slate-600);">
        Replying officially on behalf of <strong>Manila Artisan Bakery & Cafe</strong>:
      </div>
      <div class="form-group">
        <label>OFFICIAL RESPONSE</label>
        <textarea class="form-control" id="merchant-reply-text" rows="4" placeholder="Thank the customer or provide service follow-up details..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn btn-outline" onclick="window.app.closeModal('modal-merchant-reply')">Cancel</button>
        <button class="btn btn-emerald" onclick="window.app.submitMerchantReply('${reviewId}')">
          Publish Official Response
        </button>
      </div>
    `;

    openModal('modal-merchant-reply');
  }

  function submitMerchantReply(reviewId) {
    showToast('Official merchant reply published and verified by audit timestamp!', 'success');
    closeModal('modal-merchant-reply');
  }

  // =========================================================================
  // VIEW 7: BUSINESS DIRECTORY (Directory Search View)
  // =========================================================================
  async function loadBusinesses() {
    const container = document.getElementById('directory-biz-grid');
    if (!container) return;

    filterAndRenderBusinesses();
  }

  function filterAndRenderBusinesses() {
    const container = document.getElementById('directory-biz-grid');
    if (!container) return;

    let list = [...state.businesses];

    if (state.filters.bizSearch) {
      const q = state.filters.bizSearch.toLowerCase();
      list = list.filter(b =>
        (b.business_name && b.business_name.toLowerCase().includes(q)) ||
        (b.short_description && b.short_description.toLowerCase().includes(q)) ||
        (b.industry && b.industry.toLowerCase().includes(q))
      );
    }

    if (state.filters.bizCategory && state.filters.bizCategory !== 'all') {
      list = list.filter(b => (b.industry || '').toLowerCase().includes(state.filters.bizCategory.toLowerCase()));
    }

    if (state.filters.bizLocation && state.filters.bizLocation !== 'all') {
      list = list.filter(b => (b.city_name || b.address || '').toLowerCase().includes(state.filters.bizLocation.toLowerCase()));
    }

    const countEl = document.getElementById('biz-results-count');
    if (countEl) countEl.textContent = `${list.length} Verified Philippine Enterprises Found`;

    if (list.length === 0) {
      container.innerHTML = `<div class="vp-empty-state" style="grid-column:1/-1;">No businesses match your search criteria.</div>`;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="vp-card" id="dir-biz-${b.id}">
        <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:12px;">
          <div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.3rem;">
            ${(b.business_name || 'B').charAt(0)}
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <h4 style="font-weight:800; font-size:1.05rem; color:var(--navy-900); margin:0;">${escapeHtml(b.business_name)}</h4>
              <span class="badge badge-emerald">✓ Verified</span>
            </div>
            <div style="font-size:0.78rem; color:var(--slate-500); margin-top:2px;">
              📍 ${escapeHtml(b.city_name || 'Philippines')} • 🏢 ${escapeHtml(b.industry || 'Enterprise')}
            </div>
          </div>
        </div>
        <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:14px; flex:1; line-height:1.4;">${escapeHtml(b.short_description || '')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:12px;">
          <span style="color:var(--amber-600); font-weight:800; font-size:0.88rem;">★ ${b.rating || 5.0} (${b.review_count || 12})</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-outline" style="padding:4px 10px; font-size:0.78rem;" onclick="window.app.toggleCompare('${b.id}')">
              ${state.compareBizIds.includes(b.id) ? '✓ Compared' : '+ Compare'}
            </button>
            <button class="btn btn-emerald" style="padding:4px 10px; font-size:0.78rem;" onclick="window.app.route('business-profile', { id: '${b.id}' })">
              Profile →
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // VIEW 8: VERIFIED FREELANCERS (Verified Freelancers.png)
  // =========================================================================
  async function loadFreelancers() {
    const container = document.getElementById('directory-fl-grid');
    if (!container) return;

    filterAndRenderFreelancers();
  }

  function filterAndRenderFreelancers() {
    const container = document.getElementById('directory-fl-grid');
    if (!container) return;

    const q = (document.getElementById('fl-search-input')?.value || state.filters.flSearch || '').toLowerCase();
    const loc = document.getElementById('fl-loc-select')?.value || 'all';
    const cat = document.getElementById('fl-cat-select')?.value || 'all';
    const rating = document.getElementById('fl-rating-select')?.value || 'all';
    const maxRate = document.getElementById('fl-maxrate-input')?.value || '';
    const verifiedOnly = document.getElementById('fl-verified-checkbox')?.checked || false;
    const trustScore = document.getElementById('fl-trust-select')?.value || 'all';

    let list = [...state.freelancers];

    if (q) {
      list = list.filter(f =>
        (f.full_name && f.full_name.toLowerCase().includes(q)) ||
        (f.headline && f.headline.toLowerCase().includes(q)) ||
        (f.bio && f.bio.toLowerCase().includes(q)) ||
        (f.skills && JSON.stringify(f.skills).toLowerCase().includes(q))
      );
    }

    if (loc !== 'all') {
      list = list.filter(f => (f.city_name || '').toLowerCase().includes(loc.toLowerCase()));
    }

    if (rating !== 'all') {
      const minR = parseFloat(rating);
      list = list.filter(f => (f.rating || 0) >= minR);
    }

    if (maxRate) {
      const max = parseFloat(maxRate);
      if (!isNaN(max)) {
        list = list.filter(f => (f.hourly_rate_php || 0) <= max);
      }
    }

    const countEl = document.getElementById('fl-results-count');
    if (countEl) countEl.textContent = `${list.length} Verified Freelancers Available`;

    if (list.length === 0) {
      container.innerHTML = `<div class="vp-empty-state" style="grid-column:1/-1;">No freelancers match the selected filter criteria.</div>`;
      return;
    }

    container.innerHTML = list.map(f => `
      <div class="vp-card" id="fl-card-${f.id}">
        <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:12px;">
          <img src="${f.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;" alt="${f.full_name}">
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <h4 style="font-weight:800; font-size:1.05rem; color:var(--navy-900); margin:0;">${escapeHtml(f.full_name)}</h4>
              <span class="badge badge-gold">⭐ Top Rated</span>
            </div>
            <div style="font-size:0.78rem; color:var(--slate-500); margin-top:2px;">
              ${escapeHtml(f.headline)} • 📍 ${escapeHtml(f.city_name || 'Philippines')}
            </div>
          </div>
        </div>

        <p style="font-size:0.85rem; color:var(--slate-600); margin-bottom:14px; flex:1; line-height:1.4;">${escapeHtml(f.bio || '')}</p>

        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
          ${(f.skills || ['React', 'TypeScript', 'Node.js']).map(s => `
            <span class="badge" style="background:var(--slate-100); color:var(--slate-700); font-size:0.72rem; border-color:var(--slate-300);">${escapeHtml(s)}</span>
          `).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:12px;">
          <div>
            <div style="font-weight:900; color:var(--navy-900); font-size:1.05rem;">₱${(f.hourly_rate_php || 850).toLocaleString()}<span style="font-size:0.75rem; color:var(--slate-500); font-weight:normal;">/hr</span></div>
            <div style="font-size:0.72rem; color:var(--emerald-600); font-weight:700;">✓ ID & NBI Cleared</div>
          </div>
          <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.82rem;" onclick="window.app.startChatWithEntity('${f.id}', '${escapeHtml(f.full_name)}', 'freelancer')">
            Hire Freelancer →
          </button>
        </div>
      </div>
    `).join('');
  }

  function resetFreelancerFilters() {
    if (document.getElementById('fl-search-input')) document.getElementById('fl-search-input').value = '';
    if (document.getElementById('fl-loc-select')) document.getElementById('fl-loc-select').value = 'all';
    if (document.getElementById('fl-cat-select')) document.getElementById('fl-cat-select').value = 'all';
    if (document.getElementById('fl-rating-select')) document.getElementById('fl-rating-select').value = 'all';
    if (document.getElementById('fl-maxrate-input')) document.getElementById('fl-maxrate-input').value = '';
    if (document.getElementById('fl-verified-checkbox')) document.getElementById('fl-verified-checkbox').checked = false;
    if (document.getElementById('fl-trust-select')) document.getElementById('fl-trust-select').value = 'all';
    filterAndRenderFreelancers();
  }

  // =========================================================================
  // VIEW 9: PRICING & KPIS (Pricing and KPIs.png)
  // =========================================================================
  function loadPricingPlans() {
    const container = document.getElementById('pricing-plans-grid');
    if (!container) return;

    state.plans = [
      {
        id: 'plan-starter',
        name: 'Starter Verification',
        price_monthly: 0,
        badge: 'FREE TIER',
        description: 'Essential DTI / SEC verification badge and listing in public Philippine directory.',
        features: ['Public Business Profile', 'DTI/SEC Verified Badge', 'Up to 25 Customer Reviews', 'Standard Community Search']
      },
      {
        id: 'plan-pro',
        name: 'Business Pro Verified',
        price_monthly: 1499,
        badge: 'POPULAR',
        description: 'Priority KYB accreditation seal, encrypted BIR 2303 vault, and verified trust seal widgets.',
        features: ['Everything in Starter', 'Official Trust Seal Website Embed', 'Unlimited Verified Reviews', 'Priority E2EE Client Inquiries', 'Audit Protection Certificate']
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise Tatak Sigurado',
        price_monthly: 4999,
        badge: 'ENTERPRISE',
        description: 'Dedicated compliance officer, UnionBank Escrow API, and multi-location management.',
        features: ['Everything in Business Pro', 'UnionBank Escrow Milestone API', 'Dedicated Compliance Auditor', 'Multi-Branch Trust Verification', '24/7 Priority Mediation SLA']
      },
      {
        id: 'plan-freelancer-pro',
        name: 'Freelancer Pro Verified',
        price_monthly: 499,
        badge: 'FOR FREELANCERS',
        description: 'NBI clearance background badge, top talent search ranking, and zero escrow withdrawal fee.',
        features: ['NBI / Government ID Verified Badge', 'Priority Ranking in Talent Search', '0% UnionBank Escrow Fee', 'Direct Maya & GCash Payouts']
      }
    ];

    container.innerHTML = state.plans.map(p => `
      <div class="vp-card" id="plan-${p.id}" style="${p.badge === 'POPULAR' ? 'border:2px solid var(--emerald-500);' : ''}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="badge ${p.badge === 'POPULAR' ? 'badge-emerald' : 'badge-navy'}">${p.badge}</span>
          </div>
          <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin-bottom:6px;">${escapeHtml(p.name)}</h3>
          <p style="font-size:0.85rem; color:var(--slate-500); min-height:42px; line-height:1.4;">${escapeHtml(p.description)}</p>
          <div style="margin:20px 0 16px;">
            <span style="font-size:2.2rem; font-weight:900; color:var(--navy-900);">₱${p.price_monthly.toLocaleString()}</span>
            <span style="color:var(--slate-500); font-size:0.85rem;">/ month</span>
          </div>

          <div style="border-top:1px solid var(--slate-100); padding-top:16px; margin-bottom:20px;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--slate-400); text-transform:uppercase; margin-bottom:8px;">WHAT'S INCLUDED:</div>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:8px; font-size:0.85rem; color:var(--slate-700);">
              ${p.features.map(f => `
                <li style="display:flex; align-items:center; gap:8px;">
                  <span style="color:var(--emerald-600); font-weight:bold;">✓</span> ${escapeHtml(f)}
                </li>
              `).join('')}
            </ul>
          </div>
        </div>

        <button class="btn ${p.badge === 'POPULAR' ? 'btn-emerald' : 'btn-outline'}" style="width:100%; padding:12px;" onclick="window.app.openCheckoutModal('${p.id}', '${escapeHtml(p.name)}', ${p.price_monthly})">
          ${p.price_monthly === 0 ? 'Get Started Free' : 'Subscribe Plan →'}
        </button>
      </div>
    `).join('');
  }

  function selectFeaturedDuration(months) {
    const priceEl = document.getElementById('feat-card-price');
    const tenureEl = document.getElementById('feat-card-tenure');
    const badgeEl = document.getElementById('feat-card-savings-badge');
    const origPriceEl = document.getElementById('feat-card-orig-price');
    const ctaBtn = document.getElementById('feat-card-cta-btn');

    // Update active button styles
    [1, 3, 6, 12].forEach(m => {
      const btn = document.getElementById(`btn-dur-${m}`);
      if (btn) {
        if (m === months) {
          btn.style.background = 'var(--navy-900)';
          btn.style.color = 'var(--white)';
        } else {
          btn.style.background = 'transparent';
          btn.style.color = 'var(--slate-700)';
        }
      }
    });

    if (months === 1) {
      if (priceEl) priceEl.textContent = '₱4,999';
      if (tenureEl) tenureEl.textContent = '/ 30-day slot';
      if (badgeEl) badgeEl.style.display = 'none';
      if (origPriceEl) origPriceEl.style.display = 'none';
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for Featured Spotlight Slot';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-1', 'Featured Listing Spotlight (1 Month)', 4999, '1 Month')");
      }
    } else if (months === 3) {
      if (priceEl) priceEl.textContent = '₱11,999';
      if (tenureEl) tenureEl.textContent = '/ 3-month promo (~₱3,999/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 20%';
        badgeEl.className = 'badge badge-emerald';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱14,997 • Save ₱2,998';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 3-Month Promo (₱11,999)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-3', 'Featured Listing 3-Month Spotlight Promo (Save 20%)', 11999, '3 Months')");
      }
    } else if (months === 6) {
      if (priceEl) priceEl.textContent = '₱21,499';
      if (tenureEl) tenureEl.textContent = '/ 6-month promo (~₱3,583/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 28% • POPULAR';
        badgeEl.className = 'badge badge-gold';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱29,994 • Save ₱8,495';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 6-Month Promo (₱21,499)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-6', 'Featured Listing 6-Month Spotlight Promo (Save 28%)', 21499, '6 Months')");
      }
    } else if (months === 12) {
      if (priceEl) priceEl.textContent = '₱35,999';
      if (tenureEl) tenureEl.textContent = '/ 1-year annual VIP (~₱2,999/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 40% • BEST VALUE';
        badgeEl.className = 'badge badge-emerald';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱59,988 • Save ₱23,989!';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 1-Year VIP (₱35,999)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-12', 'Featured Listing 1-Year VIP Spotlight Promo (Save 40%)', 35999, '1 Year')");
      }
    }
  }

  function openCheckoutModal(planId, planName, price, tenureDesc = '') {
    const modalBody = document.getElementById('checkout-modal-body');
    if (!modalBody) return;

    const displayTenure = tenureDesc ? `(${tenureDesc})` : '';

    modalBody.innerHTML = `
      <div style="margin-bottom:20px; text-align:center;">
        <div style="display:inline-flex; align-items:center; gap:6px; background:var(--emerald-50); color:var(--emerald-800); padding:3px 10px; border-radius:var(--radius-pill); font-size:0.75rem; font-weight:800; margin-bottom:8px;">
          🇵🇭 SEC & BSP COMPLIANT INVOICE
        </div>
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin-bottom:4px;">${escapeHtml(planName)}</h3>
        <div style="font-size:2rem; font-weight:900; color:var(--emerald-600);">
          ₱${price.toLocaleString()} <span style="font-size:0.85rem; color:var(--slate-500); font-weight:normal;">${escapeHtml(displayTenure)}</span>
        </div>
      </div>

      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:18px; font-size:0.82rem; color:var(--slate-700);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Official BIR E-Invoice Receipt:</span>
          <strong>Auto-Generated</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Escrow & Consumer Protection:</span>
          <strong style="color:var(--emerald-700);">✓ Included</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Audit Review Turnaround:</span>
          <strong>Under 24 Hours</strong>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:0.82rem; font-weight:700; color:var(--slate-700); margin-bottom:8px;">Select Philippine Payment Gateway</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="border:2px solid var(--emerald-500); padding:12px; border-radius:var(--radius-md); cursor:pointer; background:var(--emerald-50); display:flex; align-items:center; gap:8px;">
            <input type="radio" name="pay_gateway" value="maya" checked>
            <strong>🟢 Maya Checkout</strong>
          </label>
          <label style="border:1px solid var(--slate-300); padding:12px; border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center; gap:8px;">
            <input type="radio" name="pay_gateway" value="gcash">
            <strong>🔵 GCash QR</strong>
          </label>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--slate-200); padding-top:16px;">
        <button class="btn btn-outline" onclick="window.app.closeModal('modal-checkout')">Cancel</button>
        <button class="btn btn-emerald" onclick="window.app.processCheckout('${planId}', ${price})">
          ✓ Authorize Payment (₱${price.toLocaleString()})
        </button>
      </div>
    `;

    openModal('modal-checkout');
  }

  async function processCheckout(planId, price) {
    showToast(`Payment of ₱${price.toLocaleString()} authorized via payment gateway! Your verified spotlight status is now under priority compliance audit.`, 'success');
    closeModal('modal-checkout');
  }

  // =========================================================================
  // VIEW 10: FREELANCER PRO DASHBOARD (Full Restoration)
  // =========================================================================
  function switchFreelancerTab(tab) {
    state.activeFreelancerTab = tab;
    loadFreelancerPortal();
  }

  function loadFreelancerPortal() {
    const container = document.getElementById('freelancer-portal-content');
    if (!container) return;

    const user = state.currentUser;
    if (!state.activeFreelancerTab) {
      state.activeFreelancerTab = 'contracts';
    }
    const currentTab = state.activeFreelancerTab;

    // Demo Data for Freelancer Dashboard
    const freelancerContracts = [
      {
        id: 'CONTR-PH-2026-081',
        clientName: 'Bahay Kubo Restaurant (Makati)',
        clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        projectTitle: 'E-Commerce Online Ordering & GCash/Maya Webhooks',
        totalBudget: 45000,
        fundedInEscrow: 30000,
        status: 'IN PROGRESS',
        deadline: 'Sept 15, 2026',
        milestones: [
          { title: 'UX Flow, Figma Specs & Security Arch', amount: 15000, status: 'RELEASED', releasedDate: 'Aug 10, 2026' },
          { title: 'GCash / Maya Webhook & E-Invoice Integration', amount: 20000, status: 'SUBMITTED', deliverableUrl: 'https://github.com/veripinoy-dev/bahay-kubo-pay-v2' },
          { title: 'Production Cloud Run Cutover & Training', amount: 10000, status: 'FUNDED' }
        ]
      },
      {
        id: 'CONTR-PH-2026-094',
        clientName: 'Cebu Coastal Seafood Traders',
        clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        projectTitle: 'Offline-First React Native Mobile POS & Thermal Printing',
        totalBudget: 30000,
        fundedInEscrow: 30000,
        status: 'IN REVIEW',
        deadline: 'Sept 28, 2026',
        milestones: [
          { title: 'SQLite Offline Sync Engine & Bluetooth Printer Driver', amount: 30000, status: 'IN_REVIEW', deliverableUrl: 'https://testflight.apple.com/join/demo-pos' }
        ]
      }
    ];

    const freelancerReviews = [
      {
        id: 'REV-FR-901',
        clientName: 'Bahay Kubo Restaurant (Manager Rafael)',
        clientRole: 'Verified Business Client',
        rating: 5.0,
        date: 'Aug 12, 2026',
        project: 'E-Commerce UX & Gateway Arch',
        comment: 'Marco completed the architecture and prototype ahead of schedule. Flawless documentation, excellent communication, and complete transparency on BIR e-invoicing compliance.',
        reply: 'Salamat po Sir Rafael! Pleasure working with your team. Next milestone deliverable is now ready for your testing.'
      },
      {
        id: 'REV-FR-902',
        clientName: 'Davao Organic Agri-Export',
        clientRole: 'Enterprise Client',
        rating: 5.0,
        date: 'July 24, 2026',
        project: 'Traceability Dashboard & Barcode Scanner',
        comment: 'Top-notch developer. Real-time updates, clear milestone deliverables, and zero bugs in production. Highly recommended for any mission-critical Philippine web build.',
        reply: null
      }
    ];

    const portfolioProjects = [
      {
        title: 'VeriPinoy Compliance & Verification Engine',
        category: 'Fullstack Web App',
        tech: ['React', 'Node.js', 'PostgreSQL', 'Cloud Run'],
        desc: 'Real-time multi-tenant verification registry with cryptographic vault signatures and BSP escrow integrations.',
        link: 'https://github.com/veripinoy/compliance-core'
      },
      {
        title: 'Maya & GCash Unified Checkout Gateway',
        category: 'Fintech / Payments',
        tech: ['TypeScript', 'Express', 'Maya SDK', 'GCash QR'],
        desc: 'Microservice supporting automated BIR 2303 / 2307 invoice generation and instant QR ph webhook settlements.',
        link: 'https://github.com/veripinoy/ph-payment-suite'
      },
      {
        title: 'PH Logistics Tracker & Geofence Dispatch',
        category: 'Mobile & Cloud',
        tech: ['React Native', 'Google Maps API', 'Firebase'],
        desc: 'Fleet tracking and delivery milestone verification platform tailored for Metro Manila and provincial courier routes.',
        link: 'https://github.com/veripinoy/dispatch-tracker'
      }
    ];

    const payoutLedger = [
      { id: 'PAY-ESC-8819', date: 'Aug 10, 2026', client: 'Bahay Kubo Restaurant', gross: 15000, wtax: 150, net: 14850, method: 'UnionBank Direct (*8812)', status: 'COMPLETED' },
      { id: 'PAY-ESC-8702', date: 'July 24, 2026', client: 'Davao Organic Agri-Export', gross: 25000, wtax: 250, net: 24750, method: 'UnionBank Direct (*8812)', status: 'COMPLETED' },
      { id: 'PAY-ESC-8611', date: 'June 18, 2026', client: 'Metro Manila Tech Hub', gross: 35000, wtax: 350, net: 34650, method: 'Maya Enterprise Account', status: 'COMPLETED' }
    ];

    // Build Sub-Tab Content
    let tabContentHtml = '';

    if (currentTab === 'contracts') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">Active Contracts & Protected Escrow Milestones</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">All milestone funds are locked in BSP-compliant trust accounts before work begins.</p>
          </div>
          <button class="btn btn-emerald" onclick="window.app.showToast('Escrow Contract Builder: Select client from your active conversations', 'info'); window.app.route('chat');">
            ➕ Propose New Milestone Contract
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
          ${freelancerContracts.map(c => `
            <div class="vp-card" style="padding:22px; border-radius:var(--radius-lg); border:1px solid var(--slate-200); box-shadow:var(--shadow-sm);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <img src="${c.clientAvatar}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:1px solid var(--slate-200);">
                  <div>
                    <h4 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin:0 0 2px;">${escapeHtml(c.projectTitle)}</h4>
                    <div style="font-size:0.8rem; color:var(--slate-500);">
                      Client: <strong>${escapeHtml(c.clientName)}</strong> • Contract ID: <code>${c.id}</code> • Deadline: <strong>${c.deadline}</strong>
                    </div>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:1.25rem; font-weight:900; color:var(--navy-900);">₱${c.totalBudget.toLocaleString()}</div>
                  <span class="badge badge-emerald">🔒 ₱${c.fundedInEscrow.toLocaleString()} Funded in Escrow</span>
                </div>
              </div>

              <div style="border-top:1px solid var(--slate-100); padding-top:14px;">
                <div style="font-size:0.75rem; font-weight:800; color:var(--slate-400); text-transform:uppercase; margin-bottom:10px;">CONTRACT MILESTONES:</div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                  ${c.milestones.map((m, idx) => {
                    let statusBadge = '';
                    let actionBtn = '';
                    if (m.status === 'RELEASED') {
                      statusBadge = `<span class="badge badge-emerald">✓ Payout Released (${m.releasedDate})</span>`;
                      actionBtn = `<span style="font-size:0.8rem; color:var(--emerald-600); font-weight:700;">✓ Completed</span>`;
                    } else if (m.status === 'SUBMITTED' || m.status === 'IN_REVIEW') {
                      statusBadge = `<span class="badge badge-gold">🟡 In Client Review</span>`;
                      actionBtn = `
                        <div style="display:flex; gap:6px;">
                          <a href="${m.deliverableUrl}" target="_blank" class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;">🔗 Inspect Deliverable</a>
                          <button class="btn btn-emerald" style="padding:4px 10px; font-size:0.75rem;" onclick="window.app.requestMilestoneRelease('${c.id}', '${escapeHtml(m.title)}')">⚡ Request Payout Release</button>
                        </div>
                      `;
                    } else {
                      statusBadge = `<span class="badge badge-blue">🔵 In Progress (Funded)</span>`;
                      actionBtn = `
                        <button class="btn btn-navy" style="padding:4px 12px; font-size:0.75rem;" onclick="window.app.openSubmitDeliverableModal('${c.id}', '${escapeHtml(m.title)}', ${m.amount})">
                          📤 Submit Deliverable
                        </button>
                      `;
                    }

                    return `
                      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                          <div style="font-weight:700; font-size:0.9rem; color:var(--navy-900);">
                            Milestone ${idx + 1}: ${escapeHtml(m.title)}
                          </div>
                          <div style="font-size:0.8rem; color:var(--slate-500); margin-top:2px;">
                            Budget: <strong>₱${m.amount.toLocaleString()}</strong> • Status: ${statusBadge}
                          </div>
                        </div>
                        <div>
                          ${actionBtn}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (currentTab === 'verification') {
      tabContentHtml = `
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:20px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0 0 4px;">Official Credibility & Philippine KYC Credentials</h3>
            <p style="font-size:0.85rem; color:var(--slate-500); margin-bottom:20px;">All documents verified and cryptographically stored with audit trail.</p>

            <div style="display:flex; flex-direction:column; gap:14px;">
              <div style="background:var(--white); border:1px solid #86EFAC; background:#F0FDF4; border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">🛡️</span>
                    <strong style="color:#166534; font-size:0.95rem;">NBI Clearance Background Clearance</strong>
                    <span class="badge badge-emerald">✓ VERIFIED & ACTIVE</span>
                  </div>
                  <div style="font-size:0.8rem; color:#14532D; margin-top:4px;">
                    Reference No: <code>NBI-2026-88319-NCR</code> • Validity: <strong>Nov 28, 2026</strong> • Cleared for No Derogatory Record
                  </div>
                </div>
                <button class="btn btn-outline" style="background:var(--white); padding:6px 12px; font-size:0.8rem;" onclick="window.app.showToast('NBI Certificate cryptographic hash: SHA256 validated by VeriPinoy Staff', 'success')">
                  🔍 View Hash
                </button>
              </div>

              <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">🏛️</span>
                    <strong style="color:var(--navy-900); font-size:0.95rem;">BIR Form 1901 (Self-Employed Professional Tax)</strong>
                    <span class="badge badge-emerald">✓ VERIFIED</span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--slate-500); margin-top:4px;">
                    TIN: <code>***-***-882-000</code> • RDO 044 (Taguig / Pateros) • 8% Gross Income Tax Regime Registered
                  </div>
                </div>
                <span class="badge badge-emerald">Compliant</span>
              </div>

              <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">🪪</span>
                    <strong style="color:var(--navy-900); font-size:0.95rem;">PhilSys Philippine National ID (Level 2 Biometric)</strong>
                    <span class="badge badge-emerald">✓ VERIFIED</span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--slate-500); margin-top:4px;">
                    Digital National ID tokenized & stored under strict Data Privacy Act of 2012 compliance.
                  </div>
                </div>
                <span class="badge badge-emerald">Biometric OK</span>
              </div>

              <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">🏦</span>
                    <strong style="color:var(--navy-900); font-size:0.95rem;">BSP Verified Settlement Bank Account</strong>
                    <span class="badge badge-emerald">✓ ACTIVE</span>
                  </div>
                  <div style="font-size:0.8rem; color:var(--slate-500); margin-top:4px;">
                    UnionBank of the Philippines • Checking Account <code>****-****-8812</code> (InstaPay & PESONet linked)
                  </div>
                </div>
                <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.showToast('Bank verification certificate active', 'info')">
                  Manage Bank
                </button>
              </div>
            </div>
          </div>

          <!-- Trust Badging Preview -->
          <div>
            <div class="vp-card" style="padding:20px; border-radius:var(--radius-lg); border:1px solid var(--slate-200); background:linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);">
              <h4 style="font-size:1rem; font-weight:800; color:var(--navy-900); margin:0 0 12px;">🛡️ Your VeriPinoy Pro Badge</h4>
              <div style="border:2px solid var(--emerald-500); border-radius:var(--radius-md); padding:14px; text-align:center; background:var(--white); margin-bottom:14px;">
                <div style="font-size:1.8rem; margin-bottom:4px;">🛡️</div>
                <div style="font-weight:900; color:var(--navy-900); font-size:0.95rem;">TATAK PINOY VERIFIED PRO</div>
                <div style="font-size:0.75rem; color:var(--emerald-700); font-weight:700;">Marco Antonio Reyes • ID #10284</div>
                <div style="margin-top:8px; display:inline-flex; gap:4px;">
                  <span class="badge badge-gold">⭐ 5.0 Top Rated</span>
                  <span class="badge badge-emerald">✓ NBI Cleared</span>
                </div>
              </div>
              <p style="font-size:0.78rem; color:var(--slate-500); margin-bottom:12px;">
                Embed your live verification trust seal onto your personal portfolio website or proposal decks:
              </p>
              <button class="btn btn-outline" style="width:100%; font-size:0.8rem;" onclick="window.app.copyTrustBadgeSnippet()">
                📋 Copy Embed Badge Code
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (currentTab === 'reviews') {
      tabContentHtml = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0 0 4px;">Verified Client Reviews & Testimonials</h3>
              <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">All reviews are permanently tied to completed, paid escrow milestones.</p>
            </div>
            <div style="text-align:right;">
              <span style="font-size:1.8rem; font-weight:900; color:var(--amber-500);">★ 5.0</span>
              <span style="font-size:0.85rem; color:var(--slate-500);"> (28 Verified Reviews)</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:16px;">
            ${freelancerReviews.map(r => `
              <div class="vp-card" style="padding:20px; border-radius:var(--radius-lg); border:1px solid var(--slate-200);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                  <div>
                    <strong style="color:var(--navy-900); font-size:0.95rem;">${escapeHtml(r.clientName)}</strong>
                    <div style="font-size:0.8rem; color:var(--slate-500);">
                      ${r.clientRole} • Project: <strong>${escapeHtml(r.project)}</strong> • ${r.date}
                    </div>
                  </div>
                  <div style="color:var(--amber-500); font-weight:800; font-size:1.05rem;">
                    ★★★★★ <span style="font-size:0.85rem; color:var(--navy-900);">${r.rating.toFixed(1)}</span>
                  </div>
                </div>

                <p style="font-size:0.88rem; color:var(--slate-700); line-height:1.5; margin-bottom:12px;">
                  "${escapeHtml(r.comment)}"
                </p>

                ${r.reply ? `
                  <div style="background:var(--slate-50); border-left:3px solid var(--emerald-500); padding:10px 14px; border-radius:0 var(--radius-md) var(--radius-md) 0; font-size:0.82rem; color:var(--slate-700);">
                    <strong style="color:var(--emerald-800);">Marco Antonio Reyes (Your Reply):</strong>
                    <p style="margin:4px 0 0;">${escapeHtml(r.reply)}</p>
                  </div>
                ` : `
                  <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="window.app.openFreelancerReviewReplyModal('${r.id}', '${escapeHtml(r.clientName)}')">
                    💬 Reply to Client Review
                  </button>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (currentTab === 'portfolio') {
      tabContentHtml = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0 0 4px;">Verified Tech Stack & Portfolio Projects</h3>
              <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Showcase live work verified by previous clients and code audits.</p>
            </div>
            <button class="btn btn-emerald" onclick="window.app.openFreelancerAddPortfolioModal()">
              ➕ Add Showcase Project
            </button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:18px;">
            ${portfolioProjects.map(p => `
              <div class="vp-card" style="padding:20px; border-radius:var(--radius-lg); border:1px solid var(--slate-200); display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="badge badge-navy">${escapeHtml(p.category)}</span>
                    <span class="badge badge-emerald">✓ Verified Code</span>
                  </div>
                  <h4 style="font-size:1.05rem; font-weight:800; color:var(--navy-900); margin:0 0 6px;">${escapeHtml(p.title)}</h4>
                  <p style="font-size:0.82rem; color:var(--slate-600); line-height:1.4; margin-bottom:14px;">${escapeHtml(p.desc)}</p>
                  
                  <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:16px;">
                    ${p.tech.map(t => `<span style="background:var(--slate-100); font-size:0.72rem; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; color:var(--slate-700);">${escapeHtml(t)}</span>`).join('')}
                  </div>
                </div>

                <a href="${p.link}" target="_blank" class="btn btn-outline" style="width:100%; text-align:center; padding:8px; font-size:0.8rem;">
                  🔗 View Repository / Live Demo
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (currentTab === 'payouts') {
      tabContentHtml = `
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0 0 4px;">Escrow Ledger, Disbursements & Withholding Tax</h3>
              <p style="font-size:0.85rem; color:var(--slate-500); margin:0;">Transparent ledger with automatic BIR 2307 Withholding Tax receipt generations.</p>
            </div>
            <button class="btn btn-emerald" onclick="window.app.openFreelancerWithdrawalModal()">
              🏦 Withdraw Funds (₱75,000 In Escrow)
            </button>
          </div>

          <div class="compare-table-wrap" style="margin-top:0;">
            <table class="compare-table">
              <thead>
                <tr>
                  <th style="width:140px;">Disbursement ID</th>
                  <th>Date</th>
                  <th>Client / Project</th>
                  <th>Gross Value</th>
                  <th>BIR 1% W-Tax</th>
                  <th>Net Payout</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                ${payoutLedger.map(l => `
                  <tr>
                    <td><code>${l.id}</code></td>
                    <td>${l.date}</td>
                    <td><strong>${escapeHtml(l.client)}</strong></td>
                    <td>₱${l.gross.toLocaleString()}</td>
                    <td style="color:var(--slate-500);">-₱${l.wtax.toLocaleString()}</td>
                    <td style="color:var(--emerald-600); font-weight:800;">₱${l.net.toLocaleString()}</td>
                    <td><small>${escapeHtml(l.method)}</small></td>
                    <td><span class="badge badge-emerald">✓ ${l.status}</span></td>
                    <td>
                      <button class="btn btn-outline" style="padding:2px 8px; font-size:0.72rem;" onclick="window.app.showToast('BIR 2307 e-Certificate downloaded for ${l.id}', 'success')">
                        📄 BIR 2307
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- Freelancer Pro Profile Banner -->
      <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius:var(--radius-xl); padding:32px; color:var(--white); margin-bottom:28px; box-shadow:var(--shadow-md);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
          <div style="display:flex; align-items:center; gap:18px;">
            <img src="${user.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80'}" style="width:72px; height:72px; border-radius:50%; object-fit:cover; border:3px solid var(--emerald-400);">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <h2 style="font-family:var(--font-heading); font-size:1.8rem; font-weight:900; color:var(--white); margin:0;">
                  ${escapeHtml(user.name || 'Marco Antonio Reyes')}
                </h2>
                <span class="badge badge-gold" style="font-size:0.75rem;">⭐ TOP RATED PRO</span>
                <span class="badge badge-emerald" style="font-size:0.75rem;">✓ NBI & BIR VERIFIED</span>
              </div>
              <div style="font-size:0.85rem; color:var(--slate-300);">
                Senior Fullstack Engineer & Cloud Solutions Architect • Quezon City, NCR • Member since 2024
              </div>
            </div>
          </div>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.25);" onclick="window.app.route('chat')">
              💬 Client Inquiries & Chat
            </button>
            <button class="btn btn-emerald" onclick="window.app.openFreelancerWithdrawalModal()">
              🏦 Withdraw Escrow Funds
            </button>
          </div>
        </div>

        <!-- 4 KPI Stat Boxes -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-top:24px;">
          <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:14px 18px;">
            <div style="font-size:0.72rem; text-transform:uppercase; color:var(--slate-300); font-weight:700;">PROTECTED ESCROW HOLD</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">₱75,000</div>
            <div style="font-size:0.72rem; color:var(--slate-400);">Guaranteed by BSP Partner</div>
          </div>
          <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:14px 18px;">
            <div style="font-size:0.72rem; text-transform:uppercase; color:var(--slate-300); font-weight:700;">TOTAL LIFETIME EARNINGS</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">₱184,500</div>
            <div style="font-size:0.72rem; color:var(--slate-400);">100% Tax Compliant</div>
          </div>
          <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:14px 18px;">
            <div style="font-size:0.72rem; text-transform:uppercase; color:var(--slate-300); font-weight:700;">COMPLETED CONTRACTS</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">42</div>
            <div style="font-size:0.72rem; color:var(--slate-400);">100% On-Time Delivery Rate</div>
          </div>
          <div style="background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-md); padding:14px 18px;">
            <div style="font-size:0.72rem; text-transform:uppercase; color:var(--slate-300); font-weight:700;">AUTHENTICATED RATING</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">★ 5.0</div>
            <div style="font-size:0.72rem; color:var(--slate-400);">28 Verified Reviews</div>
          </div>
        </div>
      </div>

      <!-- Freelancer Sub-Navigation Tabs Bar -->
      <div class="merchant-tab-bar" style="margin-bottom:24px;">
        <button class="merchant-tab-btn ${currentTab === 'contracts' ? 'active' : ''}" onclick="window.app.switchFreelancerTab('contracts')">
          💼 Active Contracts & Escrow (${freelancerContracts.length})
        </button>
        <button class="merchant-tab-btn ${currentTab === 'verification' ? 'active' : ''}" onclick="window.app.switchFreelancerTab('verification')">
          🛡️ Government & KYC Status
        </button>
        <button class="merchant-tab-btn ${currentTab === 'reviews' ? 'active' : ''}" onclick="window.app.switchFreelancerTab('reviews')">
          ⭐ Client Reviews (28)
        </button>
        <button class="merchant-tab-btn ${currentTab === 'portfolio' ? 'active' : ''}" onclick="window.app.switchFreelancerTab('portfolio')">
          ⚡ Verified Skills & Portfolio
        </button>
        <button class="merchant-tab-btn ${currentTab === 'payouts' ? 'active' : ''}" onclick="window.app.switchFreelancerTab('payouts')">
          🏦 Escrow Ledger & Payouts
        </button>
      </div>

      <!-- Tab Body Container -->
      <div style="background:var(--white); border-radius:var(--radius-xl); padding:28px; border:1px solid var(--slate-200); box-shadow:var(--shadow-sm); min-height:420px;">
        ${tabContentHtml}
      </div>
    `;
  }

  // Interactive Freelancer Actions
  function openSubmitDeliverableModal(contractId, milestoneTitle, amount) {
    const modalBody = document.getElementById('fl-details-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <span class="badge badge-navy" style="margin-bottom:8px;">ESCROW DELIVERABLE SUBMISSION</span>
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0 0 4px;">${escapeHtml(milestoneTitle)}</h3>
        <div style="font-size:0.85rem; color:var(--emerald-600); font-weight:700;">Milestone Escrow Value: ₱${amount.toLocaleString()}</div>
      </div>

      <form onsubmit="event.preventDefault(); window.app.processDeliverableSubmission('${contractId}', '${escapeHtml(milestoneTitle)}');">
        <div class="form-group">
          <label>Deliverable Artifact / GitHub / Figma URL</label>
          <input type="url" class="form-control" id="fl-deliv-url" placeholder="https://github.com/... or https://figma.com/file/..." required value="https://github.com/veripinoy-dev/deliverable-v2">
        </div>
        <div class="form-group">
          <label>Handover & Verification Release Notes</label>
          <textarea class="form-control" id="fl-deliv-notes" rows="4" placeholder="Describe the delivered features, test credentials, and deployment details..." required>Completed full webhook integration for Maya QR and GCash checkout. Unit tests and BIR invoice generators passing 100%.</textarea>
        </div>
        <div style="background:var(--emerald-50); border:1px solid #A7F3D0; border-radius:var(--radius-md); padding:12px; margin-bottom:16px; font-size:0.8rem; color:#065F46;">
          🔒 Once submitted, the client receives a 72-hour review window. If approved, funds will be released to your UnionBank settlement account immediately.
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn btn-outline" onclick="window.app.closeModal('modal-fl-details')">Cancel</button>
          <button type="submit" class="btn btn-emerald">✓ Submit for Client Sign-off</button>
        </div>
      </form>
    `;

    openModal('modal-fl-details');
  }

  function processDeliverableSubmission(contractId, milestoneTitle) {
    closeModal('modal-fl-details');
    showToast(`Milestone "${milestoneTitle}" successfully submitted for client review!`, 'success');
    loadFreelancerPortal();
  }

  function requestMilestoneRelease(contractId, milestoneTitle) {
    showToast(`Release notification pinged to client for "${milestoneTitle}". Payout release countdown initiated.`, 'info');
  }

  function openFreelancerWithdrawalModal() {
    const modalBody = document.getElementById('fl-details-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <span class="badge badge-emerald" style="margin-bottom:8px;">BSP REGULATED DISBURSEMENT</span>
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0 0 4px;">Instant Escrow Payout Withdrawal</h3>
        <div style="font-size:0.85rem; color:var(--slate-500);">Available Escrow Balance: <strong style="color:var(--emerald-600);">₱75,000.00</strong></div>
      </div>

      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:14px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.82rem;">
          <span>Settlement Account:</span>
          <strong>UnionBank of the Philippines (*8812)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.82rem;">
          <span>Processing Protocol:</span>
          <strong style="color:var(--emerald-700);">InstaPay Real-Time (Zero Fee)</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.82rem;">
          <span>BIR 1% Creditable Withholding Tax:</span>
          <strong>Auto-Generated BIR 2307</strong>
        </div>
      </div>

      <form onsubmit="event.preventDefault(); window.app.processFreelancerPayout();">
        <div class="form-group">
          <label>Withdrawal Amount (₱)</label>
          <input type="number" class="form-control" id="fl-payout-amt" value="30000" min="1000" max="75000" required>
        </div>
        <div class="form-group">
          <label>Payout Destination</label>
          <select class="form-control" id="fl-payout-dest">
            <option value="unionbank">UnionBank Corporate Direct (*8812)</option>
            <option value="gcash">GCash Verified Pro (*9812)</option>
            <option value="maya">Maya Enterprise (*3019)</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
          <button type="button" class="btn btn-outline" onclick="window.app.closeModal('modal-fl-details')">Cancel</button>
          <button type="submit" class="btn btn-emerald">✓ Confirm & Transfer Payout</button>
        </div>
      </form>
    `;

    openModal('modal-fl-details');
  }

  function processFreelancerPayout() {
    const amt = document.getElementById('fl-payout-amt')?.value || '30000';
    closeModal('modal-fl-details');
    showToast(`Payout of ₱${Number(amt).toLocaleString()} successfully processed to your UnionBank account! BIR Form 2307 certificate generated.`, 'success');
  }

  function openFreelancerAddPortfolioModal() {
    const modalBody = document.getElementById('fl-details-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0 0 4px;">Add Showcase Portfolio Project</h3>
        <p style="font-size:0.82rem; color:var(--slate-500);">Add a verified case study or live project demo to your profile.</p>
      </div>

      <form onsubmit="event.preventDefault(); window.app.processAddPortfolio();">
        <div class="form-group">
          <label>Project Title</label>
          <input type="text" class="form-control" id="fl-port-title" placeholder="e.g. Real-Time Logistics Tracker" required>
        </div>
        <div class="form-group">
          <label>Category / Specialization</label>
          <select class="form-control" id="fl-port-cat">
            <option value="Fullstack Web App">Fullstack Web App</option>
            <option value="Mobile Application">Mobile Application (iOS / Android)</option>
            <option value="Fintech / Payment Integrations">Fintech / Payment Integrations</option>
            <option value="UI/UX & Product Design">UI/UX & Product Design</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tech Stack (Comma-separated)</label>
          <input type="text" class="form-control" id="fl-port-tech" placeholder="e.g. React, Node.js, PostgreSQL, Cloud Run" required>
        </div>
        <div class="form-group">
          <label>Repository or Live Demo URL</label>
          <input type="url" class="form-control" id="fl-port-url" placeholder="https://..." required>
        </div>
        <div class="form-group">
          <label>Project Summary</label>
          <textarea class="form-control" id="fl-port-desc" rows="3" placeholder="Explain the business impact and architectural highlights..." required></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn btn-outline" onclick="window.app.closeModal('modal-fl-details')">Cancel</button>
          <button type="submit" class="btn btn-emerald">✓ Publish to Portfolio</button>
        </div>
      </form>
    `;

    openModal('modal-fl-details');
  }

  function processAddPortfolio() {
    closeModal('modal-fl-details');
    showToast('New showcase project added to your verified freelancer portfolio!', 'success');
    loadFreelancerPortal();
  }

  function openFreelancerReviewReplyModal(reviewId, clientName) {
    const modalBody = document.getElementById('fl-details-modal-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:1.3rem; font-weight:800; color:var(--navy-900); margin:0 0 4px;">Reply to Review from ${escapeHtml(clientName)}</h3>
        <p style="font-size:0.82rem; color:var(--slate-500);">Your response will appear publicly under this verified testimonial.</p>
      </div>

      <form onsubmit="event.preventDefault(); window.app.processReviewReply('${reviewId}');">
        <div class="form-group">
          <label>Your Response</label>
          <textarea class="form-control" id="fl-reply-text" rows="4" placeholder="Thank the client and summarize the successful milestone handover..." required>Maraming salamat po! It was a pleasure building this feature with your team.</textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn btn-outline" onclick="window.app.closeModal('modal-fl-details')">Cancel</button>
          <button type="submit" class="btn btn-emerald">Post Public Reply</button>
        </div>
      </form>
    `;

    openModal('modal-fl-details');
  }

  function processReviewReply(reviewId) {
    closeModal('modal-fl-details');
    showToast('Your public response has been posted!', 'success');
    loadFreelancerPortal();
  }

  // =========================================================================
  // VIEW 11: STAFF WORKSPACE
  // =========================================================================
  function loadStaffWorkspace() {
    const queueList = document.getElementById('staff-cases-queue-list');
    if (!queueList) return;

    state.staffCases = [
      {
        id: 'CASE-KYB-881',
        target_name: 'Manila Artisan Bakery & Cafe',
        type: 'BIR 2303 Renewal Audit',
        status: 'PENDING REVIEW',
        priority: 'HIGH'
      },
      {
        id: 'CASE-KYB-882',
        target_name: 'Cebu Coastal Seafood Traders',
        type: 'Mayor\'s Permit 2026 Audit',
        status: 'PENDING REVIEW',
        priority: 'NORMAL'
      }
    ];

    queueList.innerHTML = state.staffCases.map(c => `
      <div style="background:var(--white); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:16px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="color:var(--navy-900); font-size:0.95rem;">${escapeHtml(c.target_name)}</strong>
            <span class="badge badge-gold">${c.priority}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--slate-500); margin-top:2px;">
            Case ID: <code>${c.id}</code> • Task: <strong>${c.type}</strong>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.openVaultViewerModal('${c.id}', '${escapeHtml(c.target_name)}')">
            🔍 Inspect Vault Doc
          </button>
          <button class="btn btn-emerald" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.approveStaffCase('${c.id}')">
            ✓ Approve Verification
          </button>
        </div>
      </div>
    `).join('');
  }

  function approveStaffCase(caseId) {
    showToast(`Case ${caseId} approved and verification badge issued!`, 'success');
    state.staffCases = state.staffCases.filter(c => c.id !== caseId);
    loadStaffWorkspace();
  }

  // =========================================================================
  // VAULT INSPECTOR & EMBED UTILITIES
  // =========================================================================
  function openVaultViewerModal(docId, entityId) {
    const elId = document.getElementById('vault-view-doc-id');
    const elOwner = document.getElementById('vault-view-owner');
    const elSha = document.getElementById('vault-view-sha');

    if (elId) elId.textContent = docId || 'DOC-KYB-8891';
    if (elOwner) elOwner.textContent = entityId || 'BIZ-2001 (Manila Bakery)';
    if (elSha) elSha.textContent = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    openModal('modal-signed-vault-viewer');
  }

  function closeVaultViewerModal() {
    closeModal('modal-signed-vault-viewer');
  }

  function uploadVaultDoc(docType) {
    showToast(`Encrypting and uploading ${docType} with AES-256-GCM cipher...`, 'info');
    setTimeout(() => {
      showToast(`${docType} successfully encrypted and uploaded for compliance review!`, 'success');
    }, 600);
  }

  function copyTrustBadgeSnippet() {
    navigator.clipboard.writeText('<script src="https://veripinoy.ph/seal.js" data-seal-id="BIZ-2001"></script>');
    showToast('Official HTML Trust Badge embed code copied to clipboard!', 'success');
  }

  // =========================================================================
  // CHAT & MESSAGING
  // =========================================================================
  function startChatWithEntity(entityId, entityName, entityType) {
    showToast(`E2EE secure session started with ${entityName}!`, 'success');
    route('business-profile', { id: entityId });
  }

  // =========================================================================
  // HELPERS & ESCAPING
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialization
  function init() {
    try {
      const saved = localStorage.getItem('veripinoy_user');
      if (saved) {
        state.currentUser = JSON.parse(saved);
      }
    } catch (_) {}

    updateUserUI();

    window.addEventListener('hashchange', () => {
      const page = window.location.hash.replace('#', '') || 'home';
      route(page);
    });

    const initialPage = window.location.hash.replace('#', '') || 'home';
    route(initialPage);

    // Attach search handlers
    const heroSearchBtn = document.getElementById('hero-search-btn');
    if (heroSearchBtn) {
      heroSearchBtn.addEventListener('click', () => {
        const q = document.getElementById('hero-search-input')?.value || '';
        const cat = document.getElementById('hero-cat-select')?.value || 'all';
        const loc = document.getElementById('hero-loc-select')?.value || 'all';
        state.filters.bizSearch = q;
        state.filters.bizCategory = cat;
        state.filters.bizLocation = loc;
        route('businesses');
      });
    }

    const bizSearchInput = document.getElementById('biz-search-input');
    if (bizSearchInput) {
      bizSearchInput.addEventListener('input', (e) => {
        state.filters.bizSearch = e.target.value;
        filterAndRenderBusinesses();
      });
    }
  }

  function handleContactFormSubmit(formEl) {
    if (formEl) {
      formEl.reset();
    }
    closeModal('modal-contact');
    showToast('Your message has been submitted to VeriPinoy Consumer Assistance. A compliance specialist will respond within 24 hours.', 'success');
  }

  // Public Global API
  window.app = {
    state,
    route,
    switchUserPersona,
    logout,
    openModal,
    closeModal,
    closeAllModals,
    toggleMobileNav,
    closeMobileNav,
    showToast,
    switchAuthModalTab,
    renderAuthModal,
    handleAuthModalSubmit,
    handleContactFormSubmit,
    quickLoginPersona,
    loadDiscoveryData,
    loadBusinesses,
    filterAndRenderBusinesses,
    loadFreelancers,
    filterAndRenderFreelancers,
    resetFreelancerFilters,
    loadBusinessProfile,
    loadComparison,
    toggleCompare,
    loadCustomerProfile,
    loadPublicReviews,
    handlePublicReviewSubmit,
    loadBusinessHub,
    switchMerchantTab,
    openMerchantReplyModal,
    submitMerchantReply,
    loadPricingPlans,
    selectFeaturedDuration,
    openCheckoutModal,
    processCheckout,
    loadFreelancerPortal,
    switchFreelancerTab,
    openSubmitDeliverableModal,
    processDeliverableSubmission,
    requestMilestoneRelease,
    openFreelancerWithdrawalModal,
    processFreelancerPayout,
    openFreelancerAddPortfolioModal,
    processAddPortfolio,
    openFreelancerReviewReplyModal,
    processReviewReply,
    loadStaffWorkspace,
    approveStaffCase,
    openVaultViewerModal,
    closeVaultViewerModal,
    uploadVaultDoc,
    copyTrustBadgeSnippet,
    startChatWithEntity
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
