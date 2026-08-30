/**
 * VeriPinoy
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
    auditor: {
      id: 'STAFF-AUD-001',
      email: 'auditor.santos@veripinoy.ph',
      name: 'Auditor Roberto Santos',
      role: 'auditor',
      department: 'Compliance & Security Directorate',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-AUDITOR-001',
      label: 'Compliance Auditor (Santos)'
    },
    sales: {
      id: 'STAFF-SALES-001',
      email: 'camille.sales@veripinoy.ph',
      name: 'Camille Dizon',
      role: 'sales',
      department: 'Sales & Merchant Acquisition',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-SALES-001',
      label: 'Sales Growth Lead (Camille Dizon)'
    },
    staff: {
      id: 'STAFF-AUD-001',
      email: 'auditor.santos@veripinoy.ph',
      name: 'Auditor Roberto Santos',
      role: 'auditor',
      department: 'Compliance & Security Directorate',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-STAFF-001',
      label: 'Compliance Auditor (Santos)'
    },
    admin: {
      id: 'STAFF-ADM-002',
      email: 'maria.admin@veripinoy.ph',
      name: 'Maria Elena Ramos',
      role: 'admin',
      department: 'Operations & Staff Management',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-ADMIN-002',
      label: 'Operations Administrator (Maria Ramos)'
    },
    super_admin: {
      id: 'ADM-SUPER-001',
      email: 'admin.director@veripinoy.ph',
      name: 'Director Alejandro Cruz',
      role: 'super_admin',
      department: 'Executive Directorate',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80',
      token: 'DEMO-TOKEN-SUPERADMIN-001',
      label: 'Super Admin & Director (Alejandro Cruz)'
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
    } else if (pageId === 'reports' || pageId === 'page-reports') {
      loadRoleBasedReports();
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
    else if (roleKey === 'auditor' || roleKey === 'sales' || roleKey === 'admin' || roleKey === 'super_admin') route('reports');
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
    const userRole = user ? (user.role || '').toLowerCase() : '';
    const isStaffOrAdmin = Boolean(user && (userRole === 'staff' || userRole === 'admin' || userRole === 'auditor' || userRole === 'sales' || userRole === 'super_admin'));
    const navActions = document.getElementById('nav-user-actions-container');

    // Rule 1: Hide "Compare" tab from the navigation bar for Staff / Admin users
    const compareNavLinks = document.querySelectorAll('.nav-link[data-route="comparison"], #nav-link-comparison');
    compareNavLinks.forEach(el => {
      el.style.display = isStaffOrAdmin ? 'none' : '';
    });

    // Rule 1b: Hide footer trust badges for staff/admin/auditors/sales
    const trustElements = document.querySelectorAll(
      '#footer-trust-badges, .footer-trust-badges-wrapper, .trust-badge-active-registry, .trust-badge-encrypted-vault, .trust-badge-ph-republic, .trust-badge-sep-1, .trust-badge-sep-2'
    );
    trustElements.forEach(el => {
      el.style.display = isStaffOrAdmin ? 'none' : '';
    });

    // Toggle body class for CSS state consistency
    document.body.classList.toggle('role-staff-admin', isStaffOrAdmin);
    document.body.classList.toggle('role-staff', Boolean(user && (userRole === 'staff' || userRole === 'auditor')));
    document.body.classList.toggle('role-auditor', Boolean(user && userRole === 'auditor'));
    document.body.classList.toggle('role-sales', Boolean(user && userRole === 'sales'));
    document.body.classList.toggle('role-admin', Boolean(user && (userRole === 'admin' || userRole === 'super_admin')));
    document.body.classList.toggle('role-super-admin', Boolean(user && userRole === 'super_admin'));

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
      } else if (user.role === 'staff' || user.role === 'admin') {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--red-600); border-color:#FECDD3; background:#FFF1F2;" onclick="window.app.route('staff-workspace')" title="Open Staff / Admin Directorate Workspace">
            🛡️ ${user.role === 'admin' ? 'Admin Directorate' : 'Staff Workspace'}
          </button>
        `;
      } else {
        rolePortalBtn = `
          <button class="btn btn-outline" style="padding:5px 12px; font-size:0.78rem; font-weight:800; color:var(--navy-900); border-color:var(--slate-200); background:var(--white);" onclick="window.app.route('customer-profile')" title="Open Customer Profile & Account">
            👤 My Account
          </button>
        `;
      }

      navActions.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          ${rolePortalBtn}

          <div style="display:flex; align-items:center; gap:8px; background:var(--slate-100); padding:4px 10px 4px 6px; border-radius:var(--radius-pill); cursor:pointer; border:1px solid var(--slate-200); transition:all 0.15s ease;" onclick="window.app.openModal('modal-switch-persona')" title="Switch active testing persona / profile">
            <div style="width:26px; height:26px; border-radius:var(--radius-sm); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; flex-shrink:0;">${(user.name || 'U').charAt(0)}</div>
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
      if (state.compareBizIds.length > 0 && !isStaffOrAdmin) {
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
  // UNIVERSAL MULTI-ROLE AUTH & REGISTRATION ONBOARDING MODULE (Login.png & Register)
  // =========================================================================
  function setAuthModalMode(mode) {
    state.authModalMode = mode === 'register' ? 'register' : 'login';
    
    // If registering, staff cannot be chosen (staff are invite-only by Directorate)
    if (state.authModalMode === 'register' && (state.authModalRole === 'staff' || state.authModalRole === 'admin')) {
      state.authModalRole = 'customer';
    }

    // Update pill buttons visual state
    const pillLogin = document.getElementById('auth-pill-login');
    const pillReg = document.getElementById('auth-pill-register');
    if (pillLogin && pillReg) {
      if (state.authModalMode === 'register') {
        pillLogin.style.background = 'transparent';
        pillLogin.style.color = 'var(--slate-600)';
        pillLogin.style.boxShadow = 'none';
        pillReg.style.background = 'var(--white)';
        pillReg.style.color = 'var(--navy-900)';
        pillReg.style.boxShadow = 'var(--shadow-xs)';
      } else {
        pillLogin.style.background = 'var(--white)';
        pillLogin.style.color = 'var(--navy-900)';
        pillLogin.style.boxShadow = 'var(--shadow-xs)';
        pillReg.style.background = 'transparent';
        pillReg.style.color = 'var(--slate-600)';
        pillReg.style.boxShadow = 'none';
      }
    }

    const titleEl = document.getElementById('auth-modal-title');
    const subEl = document.getElementById('auth-modal-subtitle');
    if (titleEl && subEl) {
      if (state.authModalMode === 'register') {
        titleEl.textContent = 'Create Your VeriPinoy Account';
        subEl.textContent = 'Choose your account type for government-aligned verification & trust onboarding';
      } else {
        titleEl.textContent = 'VeriPinoy Portal Sign In';
        subEl.textContent = 'Philippine National Trust & Compliance Infrastructure';
      }
    }

    // Show/hide staff tab in register mode
    const staffTab = document.getElementById('auth-tab-btn-staff');
    if (staffTab) {
      staffTab.style.display = state.authModalMode === 'register' ? 'none' : 'inline-flex';
    }

    renderAuthModal();
  }

  function openAuthModal(mode = 'login', role = 'customer') {
    state.authModalMode = mode;
    state.authModalRole = role;
    openModal('modal-auth');
    setAuthModalMode(mode);
    switchAuthModalTab(role);
  }

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
      roleTitle = 'Business & Enterprise';
      roleDesc = 'DTI / SEC KYB accreditation, BIR 2303 compliance vault, and verified storefront.';
      demoPersona = DEMO_PERSONAS.business;
    } else if (role === 'freelancer') {
      roleTitle = 'Freelancer Pro';
      roleDesc = 'NBI clearance verification, skill badges, UnionBank milestone escrow, and payouts.';
      demoPersona = DEMO_PERSONAS.freelancer;
    } else if (role === 'staff' || role === 'admin') {
      roleTitle = 'Compliance Directorate';
      roleDesc = 'Regulatory compliance desk, KYB audits, fraud radar moderation, and dispute arbitration.';
      demoPersona = DEMO_PERSONAS.staff;
    }

    // Header info banner for the role
    let roleBannerHtml = `
      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:800; font-size:0.95rem; color:var(--navy-900);">
            ${role === 'customer' ? '👤 Consumer / Client Onboarding' : (role === 'business' ? '🏢 Registered Enterprise / MSME Onboarding' : (role === 'freelancer' ? '💻 Freelancer Pro Onboarding' : '🛡️ Regulatory Auditor / Admin'))}
          </div>
          <span class="badge ${(role === 'staff' || role === 'admin') ? 'badge-navy' : (role === 'business' ? 'badge-emerald' : (role === 'freelancer' ? 'badge-blue' : 'badge-emerald'))}" style="font-size:0.7rem;">
            ${isLogin ? 'AUTHENTICATION' : (role === 'customer' ? 'INSTANT ACCESS' : 'C.A.R.D.O. QUEUE')}
          </span>
        </div>
        <div style="font-size:0.78rem; color:var(--slate-500); margin-top:2px;">${roleDesc}</div>
      </div>
    `;

    // Demo Quick-Login Helper Box (Only shown in Login mode)
    let loginHelperHtml = '';
    if (isLogin) {
      loginHelperHtml = `
        <div style="background:${(role === 'staff' || role === 'admin') ? '#FFF1F2' : 'var(--emerald-50)'}; border:1px solid ${(role === 'staff' || role === 'admin') ? '#FECDD3' : 'var(--emerald-200)'}; border-radius:var(--radius-md); padding:10px 14px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; flex-wrap:wrap; gap:6px;">
            <strong style="font-size:0.8rem; color:${(role === 'staff' || role === 'admin') ? '#9F1239' : 'var(--emerald-900)'};">🔑 Unified Demo Credentials:</strong>
            <div style="display:flex; gap:6px;">
              <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:0.7rem; font-weight:700; background:var(--white);" onclick="document.getElementById('modal-auth-email').value='${demoPersona.email}'; document.getElementById('modal-auth-password').value='demo123456';">Fill Form</button>
              <button type="button" class="btn ${(role === 'staff' || role === 'admin') ? 'btn-navy' : 'btn-emerald'}" style="padding:2px 10px; font-size:0.7rem; font-weight:800;" onclick="window.app.quickLoginPersona('${role}')">⚡ Instant Sign In</button>
            </div>
          </div>
          <div style="font-size:0.75rem; color:${(role === 'staff' || role === 'admin') ? '#881337' : 'var(--emerald-800)'}; line-height:1.4;">
            <strong>Email:</strong> <code style="background:rgba(255,255,255,0.7); padding:1px 5px; border-radius:3px;">${demoPersona.email}</code> &bull; 
            <strong>Password:</strong> <code style="background:rgba(255,255,255,0.7); padding:1px 5px; border-radius:3px;">demo123456</code>
          </div>
        </div>
      `;
    }

    // Distinct Registration Fields based on Selected Role
    let dynamicFieldsHtml = '';
    if (!isLogin) {
      if (role === 'customer') {
        dynamicFieldsHtml = `
          <div class="form-group">
            <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Full Legal Name *</label>
            <input type="text" class="form-control" id="modal-auth-name" placeholder="e.g. Maria Clara Santos" required>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Email Address *</label>
              <input type="email" class="form-control" id="modal-auth-email" placeholder="maria.santos@gmail.com" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Contact Mobile Number</label>
              <input type="text" class="form-control" id="modal-auth-mobile" placeholder="0917-123-4567">
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">City / Province</label>
              <input type="text" class="form-control" id="modal-auth-city" placeholder="e.g. Quezon City, Metro Manila">
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Account Password *</label>
              <input type="password" class="form-control" id="modal-auth-password" placeholder="Min. 8 characters" required>
            </div>
          </div>

          <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; font-size:0.78rem; color:#166534; display:flex; align-items:center; gap:8px;">
            <span>🛡️</span>
            <div><strong>Instant Consumer Onboarding:</strong> Immediate access to verified merchant ratings, DPA-masked reviews, and UnionBank escrow dispute protection.</div>
          </div>
        `;
      } else if (role === 'freelancer') {
        dynamicFieldsHtml = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Full Legal Name *</label>
              <input type="text" class="form-control" id="modal-auth-name" placeholder="e.g. Marco Antonio Reyes" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Professional Title / Headline *</label>
              <input type="text" class="form-control" id="modal-auth-title" placeholder="e.g. Senior Fullstack React & Node.js Developer" required>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Primary Service Category *</label>
              <select class="form-control" id="modal-auth-category" required>
                <option value="Web & Software Development">Web & Software Development</option>
                <option value="Mobile App Development">Mobile App Development</option>
                <option value="Graphic Design & UI/UX">Graphic Design & UI/UX</option>
                <option value="Digital Marketing & SEO">Digital Marketing & SEO</option>
                <option value="Virtual Assistance & Project Management">Virtual Assistance & Project Management</option>
                <option value="Accounting & Financial Bookkeeping">Accounting & Financial Bookkeeping</option>
                <option value="Content Writing & Copywriting">Content Writing & Copywriting</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Experience Level *</label>
              <select class="form-control" id="modal-auth-experience" required>
                <option value="1-2 Years">1–2 Years</option>
                <option value="3-5 Years" selected>3–5 Years</option>
                <option value="5-8 Years">5–8 Years</option>
                <option value="8+ Years">8+ Years (Senior)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Key Technical Skills & Specializations *</label>
            <input type="text" class="form-control" id="modal-auth-skills" placeholder="e.g. TypeScript, React, PostgreSQL, Tailwind CSS, REST APIs" required>
            <div style="font-size:0.72rem; color:var(--slate-500); margin-top:2px;">Separate multiple skills with commas</div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Portfolio Link / GitHub / Behance *</label>
              <input type="url" class="form-control" id="modal-auth-portfolio" placeholder="https://github.com/myusername" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Location / City *</label>
              <input type="text" class="form-control" id="modal-auth-city" placeholder="e.g. Pasig City, Metro Manila" required>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Work Email Address *</label>
              <input type="email" class="form-control" id="modal-auth-email" placeholder="freelancer@domain.ph" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Password *</label>
              <input type="password" class="form-control" id="modal-auth-password" placeholder="Min. 8 characters" required>
            </div>
          </div>

          <!-- C.A.R.D.O. Talent Verification Desk Pre-Screening Notice -->
          <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; font-size:0.78rem; color:#1E40AF; line-height:1.4;">
            <div style="font-weight:800; display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span>🏛️</span> C.A.R.D.O. Talent Pre-Screening Protocol
            </div>
            <div>Upon registration, your professional profile will automatically be queued to the <strong>Compliance, Administration, Registration & Regulatory Operations (C.A.R.D.O.)</strong> desk with <em>pending</em> status for government ID and NBI clearance audit.</div>
          </div>
        `;
      } else if (role === 'business') {
        dynamicFieldsHtml = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Authorized Rep / Contact Person *</label>
              <input type="text" class="form-control" id="modal-auth-name" placeholder="e.g. Juan Dela Cruz" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Official Trade / Store Name *</label>
              <input type="text" class="form-control" id="modal-auth-tradename" placeholder="e.g. Manila Bakery Cafe" required>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Registered Business Name (SEC/DTI) *</label>
              <input type="text" class="form-control" id="modal-auth-legalname" placeholder="e.g. Manila Bakery Corporation" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Official DTI / SEC Registration No. *</label>
              <input type="text" class="form-control" id="modal-auth-regno" placeholder="e.g. DTI-NCR-2026-9912 or CS2025-08123" required>
              <div style="font-size:0.7rem; color:var(--slate-500); margin-top:2px;">Submitted for C.A.R.D.O. registry verification</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Business Legal Structure *</label>
              <select class="form-control" id="modal-auth-biztype" required>
                <option value="Sole Proprietorship">Sole Proprietorship (DTI)</option>
                <option value="Corporation" selected>Corporation (SEC)</option>
                <option value="Partnership">Partnership (SEC)</option>
                <option value="One Person Corporation">One Person Corporation (OPC - SEC)</option>
              </select>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Primary Industry *</label>
              <select class="form-control" id="modal-auth-industry" required>
                <option value="Food & Dining">Food & Dining</option>
                <option value="Retail & E-Commerce">Retail & E-Commerce</option>
                <option value="IT & Software Services">IT & Software Services</option>
                <option value="Professional & Financial Services">Professional & Financial Services</option>
                <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                <option value="Logistics & Delivery">Logistics & Delivery</option>
                <option value="Tourism & Hospitality">Tourism & Hospitality</option>
                <option value="Manufacturing & Crafts">Manufacturing & Crafts</option>
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1.2fr 0.8fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Business Physical Address *</label>
              <input type="text" class="form-control" id="modal-auth-address" placeholder="e.g. Unit 402, High Street Building" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">City / Province *</label>
              <input type="text" class="form-control" id="modal-auth-city" placeholder="e.g. Taguig City, Metro Manila" required>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Official Business Email *</label>
              <input type="email" class="form-control" id="modal-auth-email" placeholder="owner@manilabakery.ph" required>
            </div>
            <div class="form-group">
              <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Password *</label>
              <input type="password" class="form-control" id="modal-auth-password" placeholder="Min. 8 characters" required>
            </div>
          </div>

          <!-- C.A.R.D.O. Statutory KYB Pre-Screening Notice -->
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; font-size:0.78rem; color:#92400E; line-height:1.4;">
            <div style="font-weight:800; display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span>🏛️</span> C.A.R.D.O. Statutory KYB Pre-Screening
            </div>
            <div>Enterprise registration details and DTI/SEC numbers are instantly ingested into the <strong>C.A.R.D.O. compliance review desk</strong> for statutory pre-screening and BIR 2303 tax accreditation.</div>
          </div>
        `;
      }
    } else {
      // Standard Login Form Fields
      dynamicFieldsHtml = `
        <div class="form-group">
          <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Email Address</label>
          <input type="email" class="form-control" id="modal-auth-email" placeholder="name@domain.ph" value="${demoPersona.email}" required>
        </div>

        <div class="form-group">
          <label style="font-weight:700; font-size:0.84rem; color:var(--navy-900);">Password</label>
          <input type="password" class="form-control" id="modal-auth-password" placeholder="••••••••" value="demo123456" required>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <label style="font-size:0.8rem; color:var(--slate-600); display:flex; align-items:center; gap:6px; cursor:pointer;">
            <input type="checkbox" checked> Remember me
          </label>
          <a href="javascript:void(0)" onclick="window.app.showToast('Password reset instructions sent to registered email', 'info')" style="font-size:0.8rem; color:var(--emerald-600); text-decoration:underline;">Forgot password?</a>
        </div>
      `;
    }

    // Mandatory Terms & Anti-Defamation Consent Checkbox (Required on all registrations)
    let mandatoryTermsHtml = '';
    if (!isLogin) {
      mandatoryTermsHtml = `
        <div style="background:var(--slate-50); border:1.5px solid var(--slate-300); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:16px;" id="modal-auth-terms-box">
          <label style="font-size:0.82rem; color:var(--navy-900); display:flex; align-items:flex-start; gap:10px; cursor:pointer; line-height:1.45;">
            <input type="checkbox" id="modal-auth-legal-consent" required style="margin-top:3px; accent-color:var(--emerald-600); width:16px; height:16px; flex-shrink:0;">
            <span>
              <strong>Mandatory Compliance & Safety Protection Consent:</strong><br>
              I agree to the VeriPinoy <a href="javascript:void(0)" onclick="window.app.openModal('modal-terms')" style="color:var(--navy-900); font-weight:800; text-decoration:underline;">Terms and Conditions</a>, <a href="javascript:void(0)" onclick="window.app.openFaqModal('gov')" style="color:var(--navy-900); font-weight:800; text-decoration:underline;">Privacy Policy</a>, and Community Guidelines, and acknowledge that malicious content, false defamation, and review bombing are strictly prohibited.
            </span>
          </label>
        </div>
      `;
    }

    container.innerHTML = `
      ${roleBannerHtml}
      ${loginHelperHtml}

      <form onsubmit="window.app.handleAuthModalSubmit(event, '${role}', '${isLogin ? 'login' : 'register'}')">
        ${dynamicFieldsHtml}
        ${mandatoryTermsHtml}

        <button type="submit" class="btn ${(role === 'staff' || role === 'admin') ? 'btn-navy' : 'btn-emerald'}" style="width:100%; padding:12px; font-size:0.95rem; font-weight:800; justify-content:center;" id="btn-modal-auth-submit">
          ${isLogin ? `🔐 Sign In as ${roleTitle}` : `🚀 Complete ${roleTitle} Registration`}
        </button>

        ${(role !== 'staff' && role !== 'admin') ? `
          <div style="text-align:center; margin-top:14px; font-size:0.82rem; color:var(--slate-500);">
            ${isLogin 
              ? `Don't have an account? <a href="javascript:void(0)" onclick="window.app.setAuthModalMode('register');" style="color:var(--navy-900); font-weight:800; text-decoration:underline;">Create free account</a>` 
              : `Already have an account? <a href="javascript:void(0)" onclick="window.app.setAuthModalMode('login');" style="color:var(--navy-900); font-weight:800; text-decoration:underline;">Log in here</a>`}
          </div>
        ` : `
          <div style="text-align:center; margin-top:14px; font-size:0.8rem; color:var(--slate-500);">
            🔒 Directorate Authentication &bull; Automatic Redirect to Internal Staff / Admin Workspace
          </div>
        `}
      </form>
    `;
  }

  async function handleAuthModalSubmit(e, role, mode) {
    if (e) e.preventDefault();

    const submitBtn = document.getElementById('btn-modal-auth-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="vp-spinner"></span> Processing...`;
    }

    try {
      if (mode === 'register') {
        // Verify Legal & Anti-Defamation Consent Checkbox
        const consentBox = document.getElementById('modal-auth-legal-consent');
        const termsContainer = document.getElementById('modal-auth-terms-box');
        if (!consentBox || !consentBox.checked) {
          if (termsContainer) {
            termsContainer.style.borderColor = 'var(--red-500)';
            termsContainer.style.background = '#FEF2F2';
          }
          showToast('Please accept the mandatory VeriPinoy Terms and Anti-Defamation Policy to continue.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `🚀 Complete Registration`;
          }
          return;
        }

        const email = (document.getElementById('modal-auth-email')?.value || '').trim();
        const password = (document.getElementById('modal-auth-password')?.value || '').trim();
        const fullName = (document.getElementById('modal-auth-name')?.value || '').trim();
        const mobileNumber = (document.getElementById('modal-auth-mobile')?.value || '').trim();
        const city = (document.getElementById('modal-auth-city')?.value || '').trim();

        if (!email || !password || !fullName) {
          showToast('Please fill in all required fields.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `🚀 Complete Registration`;
          }
          return;
        }

        let regPayload = {
          role,
          email,
          password,
          fullName,
          mobileNumber,
          city,
          termsAccepted: true
        };

        if (role === 'freelancer') {
          regPayload = {
            ...regPayload,
            professionalTitle: (document.getElementById('modal-auth-title')?.value || '').trim(),
            category: (document.getElementById('modal-auth-category')?.value || 'Web & Software Development'),
            yearsExperience: (document.getElementById('modal-auth-experience')?.value || '3-5 Years'),
            skills: (document.getElementById('modal-auth-skills')?.value || '').trim(),
            portfolioLinks: [(document.getElementById('modal-auth-portfolio')?.value || '').trim()],
            portfolioUrl: (document.getElementById('modal-auth-portfolio')?.value || '').trim()
          };
        } else if (role === 'business') {
          regPayload = {
            ...regPayload,
            tradeName: (document.getElementById('modal-auth-tradename')?.value || '').trim(),
            legalBusinessName: (document.getElementById('modal-auth-legalname')?.value || '').trim(),
            businessName: (document.getElementById('modal-auth-legalname')?.value || '').trim(),
            registrationNumber: (document.getElementById('modal-auth-regno')?.value || '').trim(),
            businessType: (document.getElementById('modal-auth-biztype')?.value || 'Corporation'),
            industry: (document.getElementById('modal-auth-industry')?.value || 'Food & Dining'),
            businessAddress: (document.getElementById('modal-auth-address')?.value || '').trim(),
            contactPersonName: fullName
          };
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(regPayload)
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Registration could not be completed. Please verify details.');
        }

        // Registration successful! Store session
        const newUser = {
          ...data.user,
          role: role
        };

        state.currentUser = newUser;
        if (data.token) {
          localStorage.setItem('veripinoy_token', data.token);
        }
        localStorage.setItem('veripinoy_user', JSON.stringify(newUser));

        updateUserUI();
        closeModal('modal-auth');

        // Dynamic C.A.R.D.O. feedback and automatic route redirection
        if (role === 'freelancer') {
          showToast(`Welcome, ${newUser.name}! Profile created & queued in C.A.R.D.O. talent desk (${data.cardoStatus?.applicationId || 'KYC-QUEUED'}).`, 'success');
          route('portal-freelancer');
        } else if (role === 'business') {
          showToast(`Enterprise registered! Submitted to C.A.R.D.O. compliance desk (${data.cardoStatus?.applicationId || 'KYB-QUEUED'}) for DTI/SEC pre-screening.`, 'success');
          route('business-hub');
        } else {
          showToast(`Welcome to VeriPinoy, ${newUser.name}! Your consumer account is active.`, 'success');
          route('customer-profile');
        }
        return;
      }

      // LOGIN MODE
      const email = (document.getElementById('modal-auth-email')?.value || '').trim();
      const password = (document.getElementById('modal-auth-password')?.value || '').trim();

      // Try server login endpoint
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, userType: role })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const finalRole = data.user.role || data.user.userType || role || 'customer';
            const persona = DEMO_PERSONAS[finalRole] || DEMO_PERSONAS.customer;

            state.currentUser = {
              ...persona,
              ...data.user,
              role: finalRole,
              userType: finalRole
            };

            if (data.token) {
              localStorage.setItem('veripinoy_token', data.token);
            }
            localStorage.setItem('veripinoy_user', JSON.stringify(state.currentUser));
            updateUserUI();
            closeModal('modal-auth');

            if (finalRole === 'staff' || finalRole === 'admin') {
              showToast(`Welcome ${state.currentUser.name}! Authenticated: Redirecting to Internal Staff / Admin Workspace`, 'success');
              route('staff-workspace');
            } else if (finalRole === 'business') {
              showToast(`Welcome back, ${state.currentUser.name}! Directing to Business Hub`, 'success');
              route('business-hub');
            } else if (finalRole === 'freelancer') {
              showToast(`Welcome back, ${state.currentUser.name}! Directing to Freelancer Workspace`, 'success');
              route('portal-freelancer');
            } else {
              showToast(`Welcome, ${state.currentUser.name}! Directing to My Account`, 'success');
              route('customer-profile');
            }
            return;
          }
        }
      } catch (err) {
        console.warn('API login fallback to persona handler:', err);
      }

      // Fallback Demo Login Handler
      let finalRole = role || 'customer';
      const emailLower = email.toLowerCase();

      if (emailLower.includes('admin') || emailLower.includes('director') || emailLower === 'admin.director@veripinoy.ph') {
        finalRole = 'admin';
      } else if (emailLower.includes('staff') || emailLower.includes('auditor') || emailLower.includes('verifier') || emailLower === 'auditor.santos@veripinoy.ph' || role === 'staff') {
        finalRole = 'staff';
      } else if (emailLower.includes('freelancer') || emailLower.includes('marcoreyes') || role === 'freelancer') {
        finalRole = 'freelancer';
      } else if (emailLower.includes('owner') || emailLower.includes('bakery') || emailLower.includes('biz') || role === 'business') {
        finalRole = 'business';
      }

      const persona = DEMO_PERSONAS[finalRole] || DEMO_PERSONAS.customer;
      state.currentUser = {
        ...persona,
        email: email || persona.email,
        name: persona.name,
        role: finalRole,
        userType: finalRole
      };

      localStorage.setItem('veripinoy_user', JSON.stringify(state.currentUser));
      updateUserUI();
      closeModal('modal-auth');

      if (finalRole === 'staff' || finalRole === 'admin') {
        showToast(`Welcome ${state.currentUser.name}! Authenticated: Redirecting to Internal Staff / Admin Workspace`, 'success');
        route('staff-workspace');
      } else if (finalRole === 'business') {
        showToast(`Welcome back, ${state.currentUser.name}! Directing to Business Hub`, 'success');
        route('business-hub');
      } else if (finalRole === 'freelancer') {
        showToast(`Welcome back, ${state.currentUser.name}! Directing to Freelancer Workspace`, 'success');
        route('portal-freelancer');
      } else {
        showToast(`Welcome, ${state.currentUser.name}! Directing to My Account`, 'success');
        route('customer-profile');
      }
    } catch (err) {
      showToast(err.message || 'An error occurred during authentication.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = mode === 'register' ? `🚀 Complete Registration` : `🔐 Sign In`;
      }
    }
  }

  function quickLoginPersona(role) {
    switchUserPersona(role);
    closeModal('modal-auth');
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
          <div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--navy-900); color:var(--amber-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.2rem; flex-shrink:0;">${(f.full_name || 'F').charAt(0)}</div>
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
            <div style="width:72px; height:72px; border-radius:var(--radius-lg); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:1.8rem; border:3px solid var(--emerald-500); margin:0 auto 12px;">${(user.name || 'M').charAt(0)}</div>
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
          <div style="width:48px; height:48px; border-radius:var(--radius-md); background:var(--navy-900); color:var(--amber-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.25rem; flex-shrink:0;">${(f.full_name || 'F').charAt(0)}</div>
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
      if (priceEl) priceEl.textContent = '₱2,499';
      if (tenureEl) tenureEl.textContent = '/ 30-day slot';
      if (badgeEl) badgeEl.style.display = 'none';
      if (origPriceEl) origPriceEl.style.display = 'none';
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for Featured Spotlight Slot (₱2,499)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-1', 'Featured Listing Spotlight (1 Month)', 2499, '1 Month')");
      }
    } else if (months === 3) {
      if (priceEl) priceEl.textContent = '₱5,999';
      if (tenureEl) tenureEl.textContent = '/ 3-month promo (~₱1,999/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 20%';
        badgeEl.className = 'badge badge-emerald';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱7,497 • Save ₱1,498';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 3-Month Promo (₱5,999)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-3', 'Featured Listing 3-Month Spotlight Promo (Save 20%)', 5999, '3 Months')");
      }
    } else if (months === 6) {
      if (priceEl) priceEl.textContent = '₱9,999';
      if (tenureEl) tenureEl.textContent = '/ 6-month promo (~₱1,666/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 33% • POPULAR';
        badgeEl.className = 'badge badge-gold';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱14,994 • Save ₱4,995';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 6-Month Promo (₱9,999)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-6', 'Featured Listing 6-Month Spotlight Promo (Save 33%)', 9999, '6 Months')");
      }
    } else if (months === 12) {
      if (priceEl) priceEl.textContent = '₱14,499';
      if (tenureEl) tenureEl.textContent = '/ 1-year annual VIP (~₱1,208/mo)';
      if (badgeEl) {
        badgeEl.textContent = 'SAVE 52% • BEST VALUE';
        badgeEl.className = 'badge badge-emerald';
        badgeEl.style.display = 'inline-block';
      }
      if (origPriceEl) {
        origPriceEl.textContent = 'Regular: ₱29,988 • Save ₱15,489!';
        origPriceEl.style.display = 'block';
      }
      if (ctaBtn) {
        ctaBtn.textContent = 'Apply for 1-Year VIP (₱14,499)';
        ctaBtn.setAttribute('onclick', "window.app.openCheckoutModal('plan-boost-12', 'Featured Listing 1-Year VIP Spotlight Promo (Save 52%)', 14499, '1 Year')");
      }
    }
  }

  // =========================================================================
  // INTERACTIVE CUSTOMER VALUE & ROI CALCULATOR
  // =========================================================================
  let roiSelectedCampaign = 6;

  function selectRoiPlan(months) {
    roiSelectedCampaign = months;
    [1, 3, 6, 12].forEach(m => {
      const btn = document.getElementById(`roi-plan-${m}`);
      if (btn) {
        if (m === months) {
          btn.className = 'btn btn-navy roi-plan-btn active';
          btn.style.background = 'var(--navy-900)';
          btn.style.color = 'var(--white)';
        } else {
          btn.className = 'btn btn-outline roi-plan-btn';
          btn.style.background = 'transparent';
          btn.style.color = 'var(--slate-700)';
        }
      }
    });
    updateRoiCalculator();
  }

  function updateRoiCalculator() {
    const industryEl = document.getElementById('roi-calc-industry');
    const viewsEl = document.getElementById('roi-calc-views');
    const viewsDisplay = document.getElementById('roi-calc-views-display');
    const inquiriesEl = document.getElementById('roi-calc-inquiries');
    const savingsEl = document.getElementById('roi-calc-savings');
    const shieldEl = document.getElementById('roi-calc-shield');
    const returnEl = document.getElementById('roi-calc-return');
    const netRevEl = document.getElementById('roi-calc-net-rev');

    if (!viewsEl || !viewsDisplay) return;

    const views = parseInt(viewsEl.value) || 5000;
    viewsDisplay.textContent = `${views.toLocaleString()} views/mo`;

    const industry = industryEl ? industryEl.value : 'retail';

    let avgOrder = 1800;
    let convRate = 0.034;
    let promoDiscountPct = 0.10;

    if (industry === 'food') {
      avgOrder = 1200;
      convRate = 0.042;
      promoDiscountPct = 0.12;
    } else if (industry === 'services') {
      avgOrder = 25000;
      convRate = 0.018;
      promoDiscountPct = 0.08;
    } else if (industry === 'freelance') {
      avgOrder = 35000;
      convRate = 0.015;
      promoDiscountPct = 0.08;
    } else if (industry === 'manufacturing') {
      avgOrder = 80000;
      convRate = 0.009;
      promoDiscountPct = 0.06;
    }

    const estInquiries = Math.round(views * convRate);
    const estCustomerSavings = Math.round(estInquiries * (avgOrder * promoDiscountPct));
    const estGrossRevenue = estInquiries * avgOrder;

    let campaignMonthlyCost = 1666;
    let shieldCoverage = '₱75,000';

    if (roiSelectedCampaign === 1) {
      campaignMonthlyCost = 2499;
      shieldCoverage = '₱25,000';
    } else if (roiSelectedCampaign === 3) {
      campaignMonthlyCost = 1999;
      shieldCoverage = '₱50,000';
    } else if (roiSelectedCampaign === 6) {
      campaignMonthlyCost = 1666;
      shieldCoverage = '₱75,000';
    } else if (roiSelectedCampaign === 12) {
      campaignMonthlyCost = 1208;
      shieldCoverage = '₱100,000';
    }

    const roiMultiple = (estGrossRevenue / campaignMonthlyCost).toFixed(1);

    if (inquiriesEl) inquiriesEl.textContent = `${estInquiries.toLocaleString()} Inquiries`;
    if (savingsEl) savingsEl.textContent = `₱${estCustomerSavings.toLocaleString()}`;
    if (shieldEl) shieldEl.textContent = shieldCoverage;
    if (returnEl) returnEl.textContent = `${roiMultiple}x ROI`;
    if (netRevEl) netRevEl.textContent = `Est. ₱${estGrossRevenue.toLocaleString()} gross sales value`;
  }

  // =========================================================================
  // CHECKOUT & PROMO VOUCHER MODAL
  // =========================================================================
  let currentCheckoutData = {
    planId: '',
    planName: '',
    basePrice: 0,
    discount: 0,
    promoCode: '',
    finalPrice: 0,
    tenureDesc: ''
  };

  const VALID_PROMOS = {
    'PINOYTRUST20': { type: 'pct', value: 0.20, desc: '20% Special Community Discount' },
    'MSMEBOOST': { type: 'flat', value: 500, desc: '₱500 MSME Growth Voucher' },
    'WELCOME2026': { type: 'pct', value: 0.15, desc: '15% Welcome Promo Voucher' },
    'VIPPINOY': { type: 'pct', value: 0.25, desc: '25% VIP Privilege Voucher' }
  };

  function openCheckoutModal(planId, planName, price, tenureDesc = '') {
    const modalBody = document.getElementById('checkout-modal-body');
    if (!modalBody) return;

    currentCheckoutData = {
      planId,
      planName,
      basePrice: price,
      discount: 0,
      promoCode: '',
      finalPrice: price,
      tenureDesc
    };

    renderCheckoutModal();
    openModal('modal-checkout');
  }

  function renderCheckoutModal() {
    const modalBody = document.getElementById('checkout-modal-body');
    if (!modalBody) return;

    const { planId, planName, basePrice, discount, promoCode, finalPrice, tenureDesc } = currentCheckoutData;
    const displayTenure = tenureDesc ? `(${tenureDesc})` : '';

    modalBody.innerHTML = `
      <div style="margin-bottom:18px; text-align:center;">
        <div style="display:inline-flex; align-items:center; gap:6px; background:var(--emerald-50); color:var(--emerald-800); padding:3px 10px; border-radius:var(--radius-pill); font-size:0.75rem; font-weight:800; margin-bottom:8px;">
          🇵🇭 SEC & BSP COMPLIANT INVOICE
        </div>
        <h3 style="font-size:1.25rem; font-weight:800; color:var(--navy-900); margin-bottom:4px;">${escapeHtml(planName)}</h3>
        <div style="font-size:1.9rem; font-weight:900; color:var(--emerald-600);">
          ₱${finalPrice.toLocaleString()} <span style="font-size:0.85rem; color:var(--slate-500); font-weight:normal;">${escapeHtml(displayTenure)}</span>
        </div>
        ${discount > 0 ? `
          <div style="font-size:0.78rem; color:var(--emerald-700); font-weight:700; margin-top:2px;">
            🎉 Promo Code <code>${escapeHtml(promoCode)}</code> Applied! (Saved ₱${discount.toLocaleString()})
          </div>
        ` : ''}
      </div>

      <!-- Customer Value & Statutory Invoicing Details -->
      <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:16px; font-size:0.82rem; color:var(--slate-700);">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Official BIR Form 2303 E-Invoice:</span>
          <strong>Auto-Generated</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>VeriPinoy Buyer Protection Fund:</span>
          <strong style="color:var(--emerald-700);">✓ ₱25k - ₱100k Included</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Storefront Customer Perks Badge:</span>
          <strong style="color:var(--navy-900);">Active & Verified</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Audit Review Turnaround:</span>
          <strong>Under 24 Hours</strong>
        </div>
      </div>

      <!-- Promo Code Input Voucher Box -->
      <div style="background:var(--amber-50); border:1px solid var(--amber-200); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:16px;">
        <label style="display:block; font-size:0.8rem; font-weight:800; color:var(--amber-900); margin-bottom:6px;">
          🎟️ Have a Customer / Partner Promo Voucher?
        </label>
        <div style="display:flex; gap:8px;">
          <input type="text" id="checkout-promo-input" class="form-control" placeholder="e.g. PINOYTRUST20, MSMEBOOST" value="${escapeHtml(promoCode)}" style="text-transform:uppercase; font-weight:700; font-size:0.85rem; height:38px;">
          <button type="button" class="btn btn-navy" style="padding:6px 14px; font-size:0.8rem; white-space:nowrap;" onclick="window.app.applyCheckoutPromoCode()">
            Apply Code
          </button>
        </div>
        <div style="font-size:0.72rem; color:var(--amber-800); margin-top:4px;">
          Available demo codes: <code style="background:rgba(255,255,255,0.7); padding:1px 4px; border-radius:3px;">PINOYTRUST20</code> (20% Off), <code style="background:rgba(255,255,255,0.7); padding:1px 4px; border-radius:3px;">MSMEBOOST</code> (₱500 Off)
        </div>
      </div>

      <!-- Payment Gateway Selection -->
      <div style="margin-bottom:18px;">
        <label style="display:block; font-size:0.82rem; font-weight:700; color:var(--slate-700); margin-bottom:8px;">Select Philippine Payment Gateway</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="border:2px solid var(--emerald-500); padding:10px 12px; border-radius:var(--radius-md); cursor:pointer; background:var(--emerald-50); display:flex; align-items:center; gap:8px; font-size:0.85rem;">
            <input type="radio" name="pay_gateway" value="maya" checked>
            <strong>🟢 Maya Checkout</strong>
          </label>
          <label style="border:1px solid var(--slate-300); padding:10px 12px; border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.85rem;">
            <input type="radio" name="pay_gateway" value="gcash">
            <strong>🔵 GCash QR</strong>
          </label>
        </div>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; border-top:1px solid var(--slate-200); padding-top:14px;">
        <button class="btn btn-outline" onclick="window.app.closeModal('modal-checkout')">Cancel</button>
        <button class="btn btn-emerald" onclick="window.app.processCheckout('${planId}', ${finalPrice})">
          ✓ Authorize Payment (₱${finalPrice.toLocaleString()})
        </button>
      </div>
    `;
  }

  function applyCheckoutPromoCode() {
    const input = document.getElementById('checkout-promo-input');
    if (!input) return;

    const code = (input.value || '').trim().toUpperCase();
    if (!code) {
      showToast('Please enter a valid promo code.', 'warning');
      return;
    }

    const promo = VALID_PROMOS[code];
    if (!promo) {
      showToast(`Invalid promo code "${code}". Try PINOYTRUST20 or MSMEBOOST.`, 'error');
      return;
    }

    let discountAmount = 0;
    if (promo.type === 'pct') {
      discountAmount = Math.round(currentCheckoutData.basePrice * promo.value);
    } else if (promo.type === 'flat') {
      discountAmount = promo.value;
    }

    const calculatedPrice = Math.max(0, currentCheckoutData.basePrice - discountAmount);

    currentCheckoutData.discount = discountAmount;
    currentCheckoutData.promoCode = code;
    currentCheckoutData.finalPrice = calculatedPrice;

    renderCheckoutModal();
    showToast(`✓ Promo code "${code}" applied! You saved ₱${discountAmount.toLocaleString()} (${promo.desc}).`, 'success');
  }

  async function processCheckout(planId, price) {
    const certNumber = `VP-BOND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    showToast(`Payment of ₱${price.toLocaleString()} authorized successfully! Buyer Protection Certificate #${certNumber} issued and BIR 2303 e-receipt generated.`, 'success');
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
                  <div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--slate-100); color:var(--navy-900); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; border:1px solid var(--slate-200); flex-shrink:0;">${(c.clientName || 'C').charAt(0)}</div>
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
                <div style="font-weight:900; color:var(--navy-900); font-size:0.95rem;">VERIPINOY VERIFIED PRO</div>
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
            <div style="width:72px; height:72px; border-radius:var(--radius-lg); background:var(--navy-800); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:2rem; border:2px solid var(--emerald-400); flex-shrink:0;">${(user.name || 'M').charAt(0)}</div>
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
  // VIEW 11: STAFF COMPLIANCE & AUDITOR WORKSPACE
  // =========================================================================
  function initStaffState() {
    if (!state.staffMembers || state.staffMembers.length === 0) {
      state.staffMembers = [
        {
          id: 'ADM-SUPER-001',
          name: 'Director Alejandro Cruz',
          email: 'admin.director@veripinoy.ph',
          roleId: 'super_admin',
          roleName: 'Super Administrator & Director',
          status: 'active',
          requireMFA: true,
          lastLogin: '2026-08-29 08:30 AM',
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80'
        },
        {
          id: 'ADM-DIR-002',
          name: 'Atty. Maria Teresa Gomez',
          email: 'legal.director@veripinoy.ph',
          roleId: 'admin',
          roleName: 'Compliance Director (Admin)',
          status: 'active',
          requireMFA: true,
          lastLogin: '2026-08-28 04:15 PM',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80'
        },
        {
          id: 'STF-AUD-001',
          name: 'Auditor Roberto Santos',
          email: 'auditor.santos@veripinoy.ph',
          roleId: 'auditor',
          roleName: 'Lead Compliance Auditor',
          status: 'active',
          requireMFA: true,
          lastLogin: '2026-08-29 07:15 AM',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80'
        },
        {
          id: 'STF-VER-002',
          name: 'Clara Delos Reyes',
          email: 'clara.verifier@veripinoy.ph',
          roleId: 'verifier',
          roleName: 'KYC & DTI Verification Specialist',
          status: 'active',
          requireMFA: false,
          lastLogin: '2026-08-28 06:45 PM',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80'
        },
        {
          id: 'STF-SUP-003',
          name: 'Ramon Bautista',
          email: 'ramon.support@veripinoy.ph',
          roleId: 'support',
          roleName: 'Support Concierge & Dispute Agent',
          status: 'active',
          requireMFA: false,
          lastLogin: '2026-08-27 02:10 PM',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80'
        }
      ];
    }

    if (!state.staffCases || state.staffCases.length === 0) {
      state.staffCases = [
        {
          id: 'CASE-KYB-8812',
          target_name: 'Manila Artisan Bakery & Cafe',
          entity_type: 'business',
          reg_no: 'DTI-NCR-2026-9912',
          type: 'BIR 2303 & Mayor\'s Permit Renewal',
          submitted_at: '2026-08-28 09:30 AM',
          status: 'PENDING AUDIT',
          workflow_status: 'UNDER REVIEW',
          assigned_to: 'Auditor Roberto Santos',
          assigned_id: 'STF-AUD-001',
          priority: 'URGENT',
          risk_score: '0.02 (Low Risk)',
          docs: ['DTI Business Name (NCR-9912)', 'BIR 2303 Certificate', 'Mayor\'s Permit 2026 (Makati City)', 'PhilSys Rep ID'],
          applicant: 'Juan dela Cruz (Owner)'
        },
        {
          id: 'CASE-KYB-8815',
          target_name: 'Cebu Coastal Seafood Logistics Inc.',
          entity_type: 'business',
          reg_no: 'SEC-CS2025-08129',
          type: 'SEC Articles & Cold-Chain Permit Verification',
          submitted_at: '2026-08-28 02:15 PM',
          status: 'PENDING AUDIT',
          workflow_status: 'PENDING AUDIT',
          assigned_to: 'Clara Delos Reyes',
          assigned_id: 'STF-VER-002',
          priority: 'HIGH',
          risk_score: '0.14 (Low-Medium)',
          docs: ['SEC Certificate of Incorporation', 'BIR 2303 Certificate', 'Bureau of Fisheries & Aquatic Cert'],
          applicant: 'Capt. Rodrigo Tan (Managing Director)'
        },
        {
          id: 'CASE-KYC-9901',
          target_name: 'Marco Antonio Reyes',
          entity_type: 'freelancer',
          reg_no: 'BIR-TIN-889-102-391',
          type: 'NBI Clearance & Freelancer Pro Certification',
          submitted_at: '2026-08-27 11:45 AM',
          status: 'PENDING AUDIT',
          workflow_status: 'AWAITING DOCS',
          assigned_to: 'Auditor Roberto Santos',
          assigned_id: 'STF-AUD-001',
          priority: 'NORMAL',
          risk_score: '0.01 (Clean Biometrics)',
          docs: ['NBI Biometric Clearance 2026', 'PhilSys National ID (Verified)', 'BIR Form 1901', 'UnionBank Proof of Account'],
          applicant: 'Marco Antonio Reyes (Senior Web Dev)'
        },
        {
          id: 'CASE-KYC-9904',
          target_name: 'Patricia May Dizon',
          entity_type: 'freelancer',
          reg_no: 'BIR-TIN-442-990-112',
          type: 'UI/UX Specialist Trust Seal Accreditation',
          submitted_at: '2026-08-29 08:10 AM',
          status: 'PENDING AUDIT',
          workflow_status: 'PENDING AUDIT',
          assigned_to: 'Unassigned',
          assigned_id: null,
          priority: 'NORMAL',
          risk_score: '0.01 (Clean Biometrics)',
          docs: ['PhilSys National ID (Biometric Match)', 'NBI Clearance No. 99182', 'Portfolio SOW Proof'],
          applicant: 'Patricia May Dizon (UI/UX Designer)'
        },
        {
          id: 'CASE-KYB-8820',
          target_name: 'Davao Agribusiness & Logistics Corp.',
          entity_type: 'business',
          reg_no: 'SEC-CS2026-11092',
          type: 'Mindanao Regional Trustmark Ingestion',
          submitted_at: '2026-08-29 06:20 AM',
          status: 'PENDING AUDIT',
          workflow_status: 'ESCALATED',
          assigned_to: 'Director Alejandro Cruz',
          assigned_id: 'ADM-SUPER-001',
          priority: 'URGENT',
          risk_score: '0.03 (Low Risk)',
          docs: ['SEC Articles of Incorporation', 'Davao City Mayor\'s Permit 2026', 'BIR 2303 Certificate'],
          applicant: 'Maria Luisa Santos (Corp Secretary)'
        }
      ];
    }

    if (!state.staffFraudAlerts) {
      state.staffFraudAlerts = [
        {
          id: 'FRAUD-RADAR-101',
          target_name: 'Bahay Kubo Restaurant',
          entity_id: 'BIZ-2002',
          category: 'Astroturfing Pattern',
          severity: 'HIGH RISK (98.4%)',
          details: '4 consecutive 5-star testimonials submitted within 180 seconds originating from the exact same /24 IP subnet without receipt proof.',
          detected_at: '2026-08-29 04:12 AM',
          status: 'FLAGGED'
        },
        {
          id: 'FRAUD-RADAR-102',
          target_name: 'Metro Fast Tech Traders',
          entity_id: 'BIZ-UNV-991',
          category: 'Document Hash Collision',
          severity: 'MEDIUM (76.5%)',
          details: 'Uploaded Mayor\'s permit PDF contains an identical SHA checksum to an existing delisted entity in Quezon City.',
          detected_at: '2026-08-28 07:45 PM',
          status: 'UNDER INVESTIGATION'
        },
        {
          id: 'FRAUD-RADAR-103',
          target_name: 'Cebu Cloud Solutions',
          entity_id: 'BIZ-2004',
          category: 'Competitor Smear Attempt',
          severity: 'SUSPICIOUS (91.2%)',
          details: '1-star review containing unverified transaction ID detected from known competitor IP geolocation block.',
          detected_at: '2026-08-27 10:22 PM',
          status: 'FLAGGED'
        }
      ];
    }

    if (!state.staffDisputes) {
      state.staffDisputes = [
        {
          id: 'DISP-ESC-401',
          contract_id: 'CTR-FL-8812',
          title: 'Fullstack Maya QR & BIR 2307 Integration',
          client_name: 'Elena Gomez (Retail Express PH)',
          freelancer_name: 'Marco Antonio Reyes',
          milestone: 'Milestone 2: Payment Webhooks & Auto Invoice',
          amount: 35000,
          issue: 'Client requested out-of-scope microservice refactoring without additional milestone escrow deposit.',
          submitted_at: '2026-08-28 01:10 PM',
          status: 'IN MEDIATION'
        },
        {
          id: 'DISP-ESC-402',
          contract_id: 'CTR-BIZ-5509',
          title: 'Bulk Corporate Catering Delivery Protocol',
          client_name: 'Horizon Logistics Corp',
          freelancer_name: 'Manila Artisan Bakery',
          milestone: 'Milestone 1: Breakfast Box Supply (200 pax)',
          amount: 18500,
          issue: 'Delivery arrival delayed by 45 minutes due to severe localized flood warning; client requests 100% refund.',
          submitted_at: '2026-08-29 05:30 AM',
          status: 'AWAITING ARBITRATION'
        }
      ];
    }

    if (!state.staffAuditLedger) {
      state.staffAuditLedger = [
        {
          id: 'AUD-LOG-9922',
          timestamp: '2026-08-29 08:30:15 PHT',
          actor: 'Director Alejandro Cruz (SUPER_ADMIN)',
          action: 'STAFF_INVITATION_SENT',
          entity: 'clara.verifier@veripinoy.ph',
          details: 'Dispatched automated onboarding invitation with Supabase Auth credential activation link.',
          hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b'
        },
        {
          id: 'AUD-LOG-9921',
          timestamp: '2026-08-29 07:15:22 PHT',
          actor: 'Auditor Roberto Santos (STF-8812)',
          action: 'APPROVED_KYB_TRUSTMARK',
          entity: 'BIZ-2001 (Manila Bakery)',
          details: 'Audited DTI Cert #NCR-9912 & BIR 2303. Issued official VeriPinoy Verification Badge.',
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        },
        {
          id: 'AUD-LOG-9920',
          timestamp: '2026-08-29 06:44:11 PHT',
          actor: 'Auditor Roberto Santos (STF-8812)',
          action: 'AES_VAULT_INSPECTION',
          entity: 'DOC-KYB-8891 (Encrypted Vault)',
          details: 'Issued short-lived 5-minute HMAC-SHA256 token for sensitive compliance document inspection.',
          hash: '4a6b2c8f0e1d3a5b7c9e2f4a6b8d0c2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4'
        },
        {
          id: 'AUD-LOG-9919',
          timestamp: '2026-08-28 16:30:00 PHT',
          actor: 'Auditor Roberto Santos (STF-8812)',
          action: 'MEDIATED_ESCROW_DISPUTE',
          entity: 'CTR-FL-7719 (Escrow Arbitration)',
          details: 'Enforced 100% deliverable release after verifying GitHub repository timestamp compliance.',
          hash: '8f0a2b4c6d8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0f2a4b6c8e0'
        }
      ];
    }

    if (!state.staffWorkspaceTab) {
      state.staffWorkspaceTab = 'queue';
    }
    if (!state.staffFilter) {
      state.staffFilter = 'all';
    }
    if (!state.auditFilterAction) {
      state.auditFilterAction = 'ALL';
    }
    if (!state.auditSearchKeyword) {
      state.auditSearchKeyword = '';
    }
  }

  function loadStaffWorkspace() {
    initStaffState();

    const container = document.getElementById('staff-cases-container');
    if (!container) return;

    const currentTab = state.staffWorkspaceTab || 'queue';
    const activeFilter = state.staffFilter || 'all';
    const userRole = state.currentUser ? state.currentUser.role : 'staff';
    const isAdminOrSuper = userRole === 'admin' || userRole === 'super_admin' || (state.currentUser && state.currentUser.roleId === 'super_admin');

    let filteredCases = state.staffCases;
    if (activeFilter === 'business') {
      filteredCases = state.staffCases.filter(c => c.entity_type === 'business');
    } else if (activeFilter === 'freelancer') {
      filteredCases = state.staffCases.filter(c => c.entity_type === 'freelancer');
    } else if (activeFilter === 'urgent') {
      filteredCases = state.staffCases.filter(c => c.priority === 'URGENT');
    }

    let tabContentHtml = '';

    // ================= TAB 1: VERIFICATION QUEUE & TICKET WORKFLOW =================
    if (currentTab === 'queue') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">Active Compliance & Document Verification Queue</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Inspect Philippine DTI, SEC, BIR 2303, Mayor's Permits, and NBI Biometric Submissions.</p>
          </div>
          
          <!-- Queue Filters -->
          <div style="display:flex; gap:6px; background:var(--slate-100); padding:4px; border-radius:var(--radius-pill); border:1px solid var(--slate-200);">
            <button class="btn ${activeFilter === 'all' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem; border:none;" onclick="window.app.filterStaffCases('all')">
              All (${state.staffCases.length})
            </button>
            <button class="btn ${activeFilter === 'business' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem; border:none;" onclick="window.app.filterStaffCases('business')">
              🏢 Businesses (${state.staffCases.filter(c => c.entity_type === 'business').length})
            </button>
            <button class="btn ${activeFilter === 'freelancer' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem; border:none;" onclick="window.app.filterStaffCases('freelancer')">
              💻 Freelancers (${state.staffCases.filter(c => c.entity_type === 'freelancer').length})
            </button>
            <button class="btn ${activeFilter === 'urgent' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem; border:none; color:var(--red-600);" onclick="window.app.filterStaffCases('urgent')">
              🔥 Urgent (${state.staffCases.filter(c => c.priority === 'URGENT').length})
            </button>
          </div>
        </div>

        ${filteredCases.length === 0 ? `
          <div style="text-align:center; padding:48px; background:var(--slate-50); border:1px dashed var(--slate-300); border-radius:var(--radius-lg);">
            <div style="font-size:2rem; margin-bottom:8px;">✓</div>
            <h4 style="color:var(--navy-900); font-weight:800;">All Verification Cases Cleared!</h4>
            <p style="font-size:0.85rem; color:var(--slate-500);">There are no pending compliance applications matching the current filter.</p>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${filteredCases.map(c => `
              <div class="vp-card" style="padding:20px; border-radius:var(--radius-lg); border:1px solid var(--slate-200); background:var(--white);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                      <span class="badge ${c.entity_type === 'business' ? 'badge-blue' : 'badge-emerald'}" style="font-size:0.7rem;">
                        ${c.entity_type === 'business' ? '🏢 BUSINESS / KYB' : '💻 FREELANCER PRO'}
                      </span>
                      <span class="badge ${c.priority === 'URGENT' ? 'badge-gold' : 'badge-navy'}" style="font-size:0.7rem;">
                        ${c.priority} PRIORITY
                      </span>
                      <span class="badge" style="font-size:0.7rem; background:rgba(37,99,235,0.1); color:var(--blue-700); border-color:rgba(37,99,235,0.2);">
                        STATUS: ${c.workflow_status || 'PENDING AUDIT'}
                      </span>
                      <span style="font-size:0.75rem; font-family:monospace; color:var(--slate-500);">${c.id}</span>
                    </div>
                    <h4 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin:0 0 2px;">
                      ${escapeHtml(c.target_name)}
                    </h4>
                    <div style="font-size:0.8rem; color:var(--slate-500);">
                      <strong>Applicant / Rep:</strong> ${escapeHtml(c.applicant)} • <strong>Reg No:</strong> <code>${escapeHtml(c.reg_no)}</code> • <strong>Submitted:</strong> ${c.submitted_at}
                    </div>
                  </div>

                  <!-- Assignment & Ticket Status Header -->
                  <div style="text-align:right; min-width:200px;">
                    <div style="font-size:0.72rem; color:var(--slate-400); text-transform:uppercase; font-weight:700;">ASSIGNED AUDITOR</div>
                    <div style="font-size:0.88rem; font-weight:800; color:var(--navy-900); margin-bottom:4px;">
                      👤 ${escapeHtml(c.assigned_to || 'Unassigned')}
                    </div>
                    <div style="font-size:0.75rem; color:var(--emerald-700); font-weight:700;">
                      AI Score: ${c.risk_score}
                    </div>
                  </div>
                </div>

                <!-- Document Checklist Bar -->
                <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px;">
                  <div style="font-size:0.72rem; font-weight:800; color:var(--slate-400); text-transform:uppercase; margin-bottom:6px;">ATTACHED ENCRYPTED EVIDENCE FILES:</div>
                  <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${c.docs.map(doc => `
                      <span style="background:var(--white); border:1px solid var(--slate-200); padding:3px 10px; border-radius:4px; font-size:0.75rem; font-weight:600; color:var(--slate-700); display:inline-flex; align-items:center; gap:6px;">
                        📄 ${escapeHtml(doc)}
                      </span>
                    `).join('')}
                  </div>
                </div>

                <!-- Ticket Assignment & Workflow Controls Bar -->
                <div style="background:rgba(241,245,249,0.7); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem; background:var(--white); font-weight:700;" onclick="window.app.claimStaffTicket('${c.id}')">
                      📌 Claim Ticket (Assign to Me)
                    </button>
                    
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:0.75rem; font-weight:700; color:var(--slate-600);">Reassign:</span>
                      <select class="input-field" style="padding:3px 8px; font-size:0.75rem; height:auto; background:var(--white);" onchange="window.app.reassignStaffTicket('${c.id}', this.value, this.options[this.selectedIndex].text)">
                        <option value="">Select Verifier...</option>
                        ${state.staffMembers.map(m => `
                          <option value="${m.id}" ${c.assigned_to === m.name ? 'selected' : ''}>${escapeHtml(m.name)} (${m.roleName.split(' ')[0]})</option>
                        `).join('')}
                      </select>
                    </div>

                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:0.75rem; font-weight:700; color:var(--slate-600);">Stage:</span>
                      <select class="input-field" style="padding:3px 8px; font-size:0.75rem; height:auto; background:var(--white);" onchange="window.app.updateCaseWorkflowStatus('${c.id}', this.value)">
                        <option value="PENDING AUDIT" ${c.workflow_status === 'PENDING AUDIT' ? 'selected' : ''}>PENDING AUDIT</option>
                        <option value="UNDER REVIEW" ${c.workflow_status === 'UNDER REVIEW' ? 'selected' : ''}>UNDER REVIEW</option>
                        <option value="AWAITING DOCS" ${c.workflow_status === 'AWAITING DOCS' ? 'selected' : ''}>AWAITING DOCS</option>
                        <option value="APPROVED" ${c.workflow_status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
                        <option value="REJECTED" ${c.workflow_status === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
                        <option value="ESCALATED" ${c.workflow_status === 'ESCALATED' ? 'selected' : ''}>ESCALATED</option>
                      </select>
                    </div>
                  </div>

                  <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; background:var(--white);" onclick="window.app.openVaultViewerModal('${c.id}', '${escapeHtml(c.target_name)}')">
                    <span>🔒</span> View Vault
                  </button>
                </div>

                <!-- Final Verification Decision Controls -->
                <div style="display:flex; justify-content:flex-end; align-items:center; flex-wrap:wrap; gap:8px; border-top:1px solid var(--slate-100); padding-top:12px;">
                  <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:var(--amber-700); border-color:var(--amber-300);" onclick="window.app.requestStaffResubmission('${c.id}', '${escapeHtml(c.target_name)}')">
                    ⚠️ Request Clarification
                  </button>
                  <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:var(--red-600); border-color:#FECDD3;" onclick="window.app.rejectStaffCase('${c.id}', '${escapeHtml(c.target_name)}')">
                    ✕ Reject
                  </button>
                  <button class="btn btn-emerald" style="padding:6px 18px; font-size:0.82rem; font-weight:800;" onclick="window.app.approveStaffCase('${c.id}', '${escapeHtml(c.target_name)}')">
                    ✓ Approve & Issue Trustmark Badge
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
    }

    // ================= TAB 2: STAFF & ROLE MANAGEMENT (Super Admin & Admin) =================
    else if (currentTab === 'staff') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">Staff & Role Hierarchy Management</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Provision new compliance officers, assign role-based access control (RBAC), and trigger automated Supabase Auth invitations.</p>
          </div>

          ${isAdminOrSuper ? `
            <button class="btn btn-navy" style="padding:7px 16px; font-size:0.82rem; font-weight:800; display:inline-flex; align-items:center; gap:6px; box-shadow:var(--shadow-sm);" onclick="window.app.openStaffInviteModal()">
              <span>👥</span> + Invite New Staff Member
            </button>
          ` : `
            <span class="badge badge-navy" style="font-size:0.75rem;">STAFF DIRECTORY • READ-ONLY</span>
          `}
        </div>

        <!-- Role Hierarchy Guide Card -->
        <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-lg); padding:16px; margin-bottom:24px; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
          <div style="border-left:3px solid var(--navy-900); padding-left:10px;">
            <strong style="color:var(--navy-900); font-size:0.82rem;">👑 Super Administrator</strong>
            <div style="font-size:0.75rem; color:var(--slate-600); margin-top:2px;">Full governance. Create, edit, and delete Admins and Staff accounts, manage all security settings.</div>
          </div>
          <div style="border-left:3px solid var(--blue-600); padding-left:10px;">
            <strong style="color:var(--navy-900); font-size:0.82rem;">🛡️ Compliance Director (Admin)</strong>
            <div style="font-size:0.75rem; color:var(--slate-600); margin-top:2px;">Add, edit, and manage Staff roles, reassign cases, and supervise regulatory queues.</div>
          </div>
          <div style="border-left:3px solid var(--emerald-600); padding-left:10px;">
            <strong style="color:var(--navy-900); font-size:0.82rem;">🔍 Compliance Auditor & Verifiers</strong>
            <div style="font-size:0.75rem; color:var(--slate-600); margin-top:2px;">Perform document audits, moderate AI fraud flags, and arbitrate escrow disputes.</div>
          </div>
        </div>

        <!-- Staff Members Table -->
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.84rem; text-align:left;">
            <thead>
              <tr style="background:var(--slate-100); border-bottom:2px solid var(--slate-200);">
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">STAFF MEMBER</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">WORK EMAIL</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">ASSIGNED ROLE</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">MFA STATUS</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">STATUS</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900);">LAST ACTIVE</th>
                <th style="padding:12px 14px; font-weight:800; color:var(--navy-900); text-align:right;">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              ${state.staffMembers.map(m => `
                <tr style="border-bottom:1px solid var(--slate-200);">
                  <td style="padding:12px 14px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:34px; height:34px; border-radius:var(--radius-md); background:var(--navy-900); color:var(--emerald-400); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.9rem; flex-shrink:0;">${(m.name || 'S').charAt(0)}</div>
                      <div>
                        <div style="font-weight:800; color:var(--navy-900);">${escapeHtml(m.name)}</div>
                        <div style="font-size:0.72rem; color:var(--slate-500); font-family:monospace;">${m.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding:12px 14px; color:var(--slate-700); font-weight:600;">
                    ${escapeHtml(m.email)}
                  </td>
                  <td style="padding:12px 14px;">
                    <span class="badge ${m.roleId === 'super_admin' ? 'badge-navy' : (m.roleId === 'admin' ? 'badge-blue' : 'badge-emerald')}" style="font-size:0.72rem;">
                      ${m.roleId === 'super_admin' ? '👑 SUPER ADMIN' : (m.roleId === 'admin' ? '🛡️ ADMIN DIRECTOR' : '🔍 ' + (m.roleName || 'AUDITOR').toUpperCase())}
                    </span>
                  </td>
                  <td style="padding:12px 14px;">
                    <span class="badge ${m.requireMFA ? 'badge-emerald' : 'badge-gold'}" style="font-size:0.7rem;">
                      ${m.requireMFA ? '🔒 MFA ACTIVE' : '⚠️ MFA OPTIONAL'}
                    </span>
                  </td>
                  <td style="padding:12px 14px;">
                    <span class="badge ${m.status === 'active' ? 'badge-emerald' : 'badge-gold'}" style="font-size:0.7rem;">
                      ● ${m.status ? m.status.toUpperCase() : 'ACTIVE'}
                    </span>
                  </td>
                  <td style="padding:12px 14px; color:var(--slate-600); font-size:0.78rem; white-space:nowrap;">
                    ${m.lastLogin || 'Recent'}
                  </td>
                  <td style="padding:12px 14px; text-align:right;">
                    ${isAdminOrSuper ? `
                      <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="window.app.openStaffEditModal('${m.id}')" title="Edit Staff Role / Status">
                          ✏️ Edit
                        </button>
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--blue-600);" onclick="window.app.resetStaffAccountPassword('${m.id}', '${escapeHtml(m.name)}')" title="Trigger Password Reset">
                          🔑 Reset
                        </button>
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--red-600); border-color:#FECDD3;" onclick="window.app.deleteStaffAccount('${m.id}', '${escapeHtml(m.name)}')" title="Delete Account">
                          🗑️
                        </button>
                      </div>
                    ` : `
                      <span style="font-size:0.75rem; color:var(--slate-400);">Protected</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // ================= TAB 3: AI FRAUD RADAR =================
    else if (currentTab === 'fraud') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">AI Fraud Radar & Review Moderation Desk</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Automated detection of astroturfed reviews, IP clustering, receipt hash collisions, and smear campaigns.</p>
          </div>
          <span class="badge badge-gold" style="font-size:0.75rem;">LIVE AI SHIELD ACTIVE</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          ${state.staffFraudAlerts.map(alert => `
            <div class="vp-card" style="padding:20px; border-radius:var(--radius-lg); border:1px solid #FECDD3; background:#FFF1F2;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span class="badge badge-gold" style="font-size:0.7rem; background:#BE123C; color:var(--white); border:none;">${alert.category}</span>
                    <span class="badge badge-navy" style="font-size:0.7rem;">${alert.severity}</span>
                    <span style="font-size:0.75rem; font-family:monospace; color:var(--slate-500);">${alert.id}</span>
                  </div>
                  <h4 style="font-size:1.15rem; font-weight:800; color:var(--navy-900); margin:0 0 2px;">
                    Target Entity: ${escapeHtml(alert.target_name)} (ID: ${alert.entity_id})
                  </h4>
                </div>
                <div style="font-size:0.75rem; color:var(--slate-500);">${alert.detected_at}</div>
              </div>

              <div style="background:rgba(255,255,255,0.8); border:1px solid rgba(225,29,72,0.2); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:14px; font-size:0.85rem; color:var(--slate-800); line-height:1.5;">
                <strong>🚨 AI Detection Reason:</strong> ${escapeHtml(alert.details)}
              </div>

              <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button class="btn btn-outline" style="padding:6px 14px; font-size:0.8rem; background:var(--white);" onclick="window.app.dismissFraudAlert('${alert.id}')">
                  ✓ Dismiss as False Positive
                </button>
                <button class="btn btn-navy" style="padding:6px 16px; font-size:0.8rem; background:#9F1239; border-color:#9F1239;" onclick="window.app.quarantineFraudAlert('${alert.id}', '${escapeHtml(alert.target_name)}')">
                  🗑️ Quarantine Flagged Activity & Issue Warning
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // ================= TAB 4: ESCROW DISPUTE ARBITRATION =================
    else if (currentTab === 'disputes') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">BSP Escrow Dispute Arbitration Directorate</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Mediating milestone disputes under Bangko Sentral ng Pilipinas consumer protection guidelines.</p>
          </div>
          <span class="badge badge-emerald" style="font-size:0.75rem;">UNIONBANK TRUST CUSTODY</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px;">
          ${state.staffDisputes.map(disp => `
            <div class="vp-card" style="padding:22px; border-radius:var(--radius-lg); border:1px solid var(--slate-200); background:var(--white);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div>
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span class="badge badge-navy" style="font-size:0.7rem;">DISPUTE ID: ${disp.id}</span>
                    <span class="badge badge-gold" style="font-size:0.7rem;">CONTRACT: ${disp.contract_id}</span>
                    <span class="badge badge-emerald" style="font-size:0.7rem;">${disp.status}</span>
                  </div>
                  <h4 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0 0 2px;">
                    ${escapeHtml(disp.title)}
                  </h4>
                  <div style="font-size:0.82rem; color:var(--slate-500);">
                    <strong>Client:</strong> ${escapeHtml(disp.client_name)} ⟷ <strong>Specialist:</strong> ${escapeHtml(disp.freelancer_name)}
                  </div>
                </div>

                <div style="text-align:right;">
                  <div style="font-size:0.72rem; color:var(--slate-400); text-transform:uppercase; font-weight:700;">LOCKED ESCROW VALUE</div>
                  <div style="font-size:1.4rem; font-weight:900; color:var(--emerald-600);">₱${disp.amount.toLocaleString()}</div>
                </div>
              </div>

              <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:14px; margin-bottom:16px;">
                <div style="font-size:0.82rem; margin-bottom:4px;"><strong>Disputed Milestone:</strong> ${escapeHtml(disp.milestone)}</div>
                <div style="font-size:0.82rem; color:var(--slate-700);"><strong>Mediation Claim:</strong> ${escapeHtml(disp.issue)}</div>
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--slate-100); padding-top:14px; flex-wrap:wrap; gap:8px;">
                <div style="font-size:0.78rem; color:var(--slate-500);">
                  🔒 Resolution triggers BSP instant automated disbursement or refund via UnionBank InstaPay.
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:var(--blue-600);" onclick="window.app.resolveStaffDispute('${disp.id}', 'split')">
                    ⚖️ 50/50 Mediated Settlement
                  </button>
                  <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:var(--amber-700);" onclick="window.app.resolveStaffDispute('${disp.id}', 'refund')">
                    ↩️ Refund Client (₱${disp.amount.toLocaleString()})
                  </button>
                  <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.8rem; font-weight:800;" onclick="window.app.resolveStaffDispute('${disp.id}', 'release')">
                    ✓ Release Payout to Specialist
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // ================= TAB 5: AES-256 VAULT INSPECTOR =================
    else if (currentTab === 'vault') {
      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">AES-256-GCM Encrypted Compliance Document Vault</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Statutory compliance documents stored at rest under Philippine Data Privacy Act 2012 encryption standards.</p>
          </div>
          <button class="btn btn-navy" style="padding:6px 14px; font-size:0.8rem;" onclick="window.app.uploadVaultDoc('BIR 2303 Certificate')">
            🔒 Ingest Encrypted Doc
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div class="vp-card" style="padding:18px; border-radius:var(--radius-lg); background:var(--white);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="badge badge-emerald">DOC-DTI-9912</span>
              <span class="badge badge-navy">AES-256-GCM</span>
            </div>
            <strong style="color:var(--navy-900); font-size:0.95rem;">DTI_Business_Name_ManilaBakery.pdf</strong>
            <div style="font-size:0.78rem; color:var(--slate-500); margin:4px 0 12px;">Entity: BIZ-2001 (Manila Artisan Bakery)</div>
            <button class="btn btn-outline" style="width:100%; padding:6px; font-size:0.8rem;" onclick="window.app.openVaultViewerModal('DOC-DTI-9912', 'Manila Artisan Bakery')">
              🔍 Inspect Decrypted Document
            </button>
          </div>

          <div class="vp-card" style="padding:18px; border-radius:var(--radius-lg); background:var(--white);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="badge badge-emerald">DOC-BIR-8812</span>
              <span class="badge badge-navy">AES-256-GCM</span>
            </div>
            <strong style="color:var(--navy-900); font-size:0.95rem;">BIR_Form_2303_Tax_Certificate.pdf</strong>
            <div style="font-size:0.78rem; color:var(--slate-500); margin:4px 0 12px;">Entity: BIZ-2001 (Manila Artisan Bakery)</div>
            <button class="btn btn-outline" style="width:100%; padding:6px; font-size:0.8rem;" onclick="window.app.openVaultViewerModal('DOC-BIR-8812', 'Manila Artisan Bakery')">
              🔍 Inspect Decrypted Document
            </button>
          </div>

          <div class="vp-card" style="padding:18px; border-radius:var(--radius-lg); background:var(--white);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="badge badge-emerald">DOC-NBI-7714</span>
              <span class="badge badge-navy">AES-256-GCM</span>
            </div>
            <strong style="color:var(--navy-900); font-size:0.95rem;">NBI_Biometric_Clearance_2026.pdf</strong>
            <div style="font-size:0.78rem; color:var(--slate-500); margin:4px 0 12px;">Entity: USER-FR-10284 (Marco Reyes)</div>
            <button class="btn btn-outline" style="width:100%; padding:6px; font-size:0.8rem;" onclick="window.app.openVaultViewerModal('DOC-NBI-7714', 'Marco Antonio Reyes')">
              🔍 Inspect Decrypted Document
            </button>
          </div>

          <div class="vp-card" style="padding:18px; border-radius:var(--radius-lg); background:var(--white);">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="badge badge-emerald">DOC-LGU-4419</span>
              <span class="badge badge-navy">AES-256-GCM</span>
            </div>
            <strong style="color:var(--navy-900); font-size:0.95rem;">Mayors_Permit_Cebu_2026.pdf</strong>
            <div style="font-size:0.78rem; color:var(--slate-500); margin:4px 0 12px;">Entity: BIZ-2003 (Cebu Coastal Logistics)</div>
            <button class="btn btn-outline" style="width:100%; padding:6px; font-size:0.8rem;" onclick="window.app.openVaultViewerModal('DOC-LGU-4419', 'Cebu Coastal Logistics')">
              🔍 Inspect Decrypted Document
            </button>
          </div>
        </div>
      `;
    }

    // ================= TAB 6: ACTIVITY AUDIT LOGGING SYSTEM =================
    else if (currentTab === 'audit') {
      const selectedAction = state.auditFilterAction || 'ALL';
      const searchKeyword = (state.auditSearchKeyword || '').toLowerCase();

      let auditLogs = state.staffAuditLedger || [];
      if (selectedAction !== 'ALL') {
        auditLogs = auditLogs.filter(l => (l.action || '').toUpperCase().includes(selectedAction));
      }
      if (searchKeyword) {
        auditLogs = auditLogs.filter(l =>
          (l.actor || '').toLowerCase().includes(searchKeyword) ||
          (l.action || '').toLowerCase().includes(searchKeyword) ||
          (l.entity || '').toLowerCase().includes(searchKeyword) ||
          (l.details || '').toLowerCase().includes(searchKeyword)
        );
      }

      tabContentHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:var(--navy-900); margin:0;">Administrative & Activity Audit Trail (/admin/audit-logs)</h3>
            <p style="font-size:0.82rem; color:var(--slate-500); margin:2px 0 0;">Cryptographically recorded, immutable audit ledger tracking all staff modifications, approvals, and security events.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" onclick="window.app.refreshLiveAuditLogs()">
              🔄 Refresh Logs
            </button>
            <button class="btn btn-emerald" style="padding:6px 16px; font-size:0.8rem; font-weight:700;" onclick="window.app.exportStaffAuditLedger()">
              📄 Export Audit Log (CSV)
            </button>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:240px;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--slate-700);">🔍 Search:</span>
            <input type="text" class="input-field" placeholder="Search by actor, action, or details..." value="${escapeHtml(state.auditSearchKeyword || '')}" oninput="window.app.state.auditSearchKeyword=this.value; window.app.loadStaffWorkspace();" style="width:100%; max-width:320px; padding:4px 10px; font-size:0.8rem;">
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.82rem; font-weight:700; color:var(--slate-700);">Filter Action:</span>
            <select class="input-field" style="padding:4px 10px; font-size:0.8rem; height:auto;" onchange="window.app.state.auditFilterAction=this.value; window.app.loadStaffWorkspace();">
              <option value="ALL" ${selectedAction === 'ALL' ? 'selected' : ''}>All Recorded Events</option>
              <option value="STAFF" ${selectedAction === 'STAFF' ? 'selected' : ''}>Staff / Account Management</option>
              <option value="APPROVED" ${selectedAction === 'APPROVED' ? 'selected' : ''}>Trustmark Approvals</option>
              <option value="CASE" ${selectedAction === 'CASE' ? 'selected' : ''}>Case Assignments</option>
              <option value="VAULT" ${selectedAction === 'VAULT' ? 'selected' : ''}>Vault Inspections</option>
              <option value="DISPUTE" ${selectedAction === 'DISPUTE' ? 'selected' : ''}>Escrow Disputes</option>
            </select>
          </div>
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
            <thead>
              <tr style="background:var(--slate-100); border-bottom:2px solid var(--slate-200);">
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">TIMESTAMP</th>
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">OPERATOR / ACTOR</th>
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ACTION CODE</th>
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">TARGET ENTITY</th>
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">AUDIT LOG DETAILS</th>
                <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">SHA-256 HASH</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding:32px; text-align:center; color:var(--slate-500);">
                    No audit records matching criteria.
                  </td>
                </tr>
              ` : auditLogs.map(log => `
                <tr style="border-bottom:1px solid var(--slate-200);">
                  <td style="padding:10px 12px; white-space:nowrap; color:var(--slate-600);">${log.timestamp}</td>
                  <td style="padding:10px 12px; font-weight:700; color:var(--navy-900);">${escapeHtml(log.actor)}</td>
                  <td style="padding:10px 12px;"><span class="badge badge-navy" style="font-size:0.68rem;">${log.action}</span></td>
                  <td style="padding:10px 12px; font-weight:600;">${escapeHtml(log.entity)}</td>
                  <td style="padding:10px 12px; color:var(--slate-700); max-width:280px;">${escapeHtml(log.details)}</td>
                  <td style="padding:10px 12px; font-family:monospace; font-size:0.7rem; color:var(--slate-400);">${(log.hash || '').slice(0, 16)}...</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Render Master Layout into #staff-cases-container
    container.innerHTML = `
      <!-- Auditor Directorate Header Banner -->
      <div style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color:var(--white); border-radius:var(--radius-xl); padding:32px; margin-bottom:28px; border:1px solid rgba(255,255,255,0.1); box-shadow:var(--shadow-md);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span class="badge badge-gold" style="font-size:0.75rem; background:rgba(245,158,11,0.2); color:var(--amber-400); border-color:var(--amber-500);">
                OFFICIAL REGULATORY & COMPLIANCE DESK
              </span>
              <span class="badge badge-emerald" style="font-size:0.75rem; background:rgba(16,185,129,0.2); color:var(--emerald-400); border-color:var(--emerald-500);">
                REPUBLIC OF THE PHILIPPINES
              </span>
            </div>
            <h1 style="font-family:var(--font-heading); font-size:2.1rem; font-weight:900; color:var(--white); margin:0 0 8px;">
              Staff Compliance & Verification Directorate
            </h1>
            <p style="font-size:0.9rem; color:var(--slate-300); max-width:720px; margin:0; line-height:1.5;">
              Central workspace for verifying DTI/SEC registrations, authenticating BIR 2303 compliance vaults, moderating AI Fraud Radar review flags, managing staff roles, and arbitrating BSP-regulated escrow milestones.
            </p>
          </div>

          <!-- Auditor Profile Badge -->
          <div style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-lg); padding:16px 20px; text-align:right; min-width:220px;">
            <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">AUTHENTICATED ${isAdminOrSuper ? 'EXECUTIVE DIRECTOR' : 'AUDITOR'}</div>
            <div style="font-size:1.1rem; font-weight:900; color:var(--amber-400); margin:2px 0;">${escapeHtml(state.currentUser ? state.currentUser.name : 'Director Alejandro Cruz')}</div>
            <div style="font-size:0.75rem; color:var(--slate-400);">${isAdminOrSuper ? 'Super Administrator & Director (ADM-SUPER-001)' : 'Lead Compliance Verifier (STF-8812)'}</div>
            <div style="margin-top:8px;">
              <span class="badge badge-emerald" style="font-size:0.68rem;">AES-256-GCM AUTHORIZED</span>
            </div>
          </div>
        </div>

        <!-- 4 Stat Metric Cards -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-top:24px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 16px;">
            <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">📋 PENDING AUDIT QUEUE</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">${state.staffCases.length} Cases</div>
            <div style="font-size:0.72rem; color:var(--amber-400);">${state.staffCases.filter(c => c.priority === 'URGENT').length} Urgent Applications</div>
          </div>

          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 16px;">
            <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">👥 REGISTERED STAFF</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--blue-400); margin:2px 0;">${state.staffMembers.length} Active</div>
            <div style="font-size:0.72rem; color:var(--slate-300);">RBAC Directorate Config</div>
          </div>

          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 16px;">
            <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">🚨 AI FRAUD RADAR FLAGS</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">${state.staffFraudAlerts.length} Active</div>
            <div style="font-size:0.72rem; color:var(--slate-300);">98.4% Confidence Score</div>
          </div>

          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 16px;">
            <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">⚖️ ESCROW DISPUTES</div>
            <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${state.staffDisputes.length} Disputes</div>
            <div style="font-size:0.72rem; color:var(--slate-300);">₱53,500 In Custody</div>
          </div>
        </div>
      </div>

      <!-- Staff Directorate Sub-Navigation Tabs Bar -->
      <div class="merchant-tab-bar" style="margin-bottom:24px;">
        <button class="merchant-tab-btn ${currentTab === 'queue' ? 'active' : ''}" onclick="window.app.switchStaffTab('queue')">
          📋 Verification Queue (${state.staffCases.length})
        </button>
        <button class="merchant-tab-btn ${currentTab === 'staff' ? 'active' : ''}" onclick="window.app.switchStaffTab('staff')">
          👥 Staff & Role Management (${state.staffMembers.length})
        </button>
        <button class="merchant-tab-btn ${currentTab === 'fraud' ? 'active' : ''}" onclick="window.app.switchStaffTab('fraud')">
          🚨 AI Fraud Radar (${state.staffFraudAlerts.length})
        </button>
        <button class="merchant-tab-btn ${currentTab === 'disputes' ? 'active' : ''}" onclick="window.app.switchStaffTab('disputes')">
          ⚖️ Escrow Dispute Arbitration (${state.staffDisputes.length})
        </button>
        <button class="merchant-tab-btn ${currentTab === 'vault' ? 'active' : ''}" onclick="window.app.switchStaffTab('vault')">
          🔒 AES-256 Vault Inspector
        </button>
        <button class="merchant-tab-btn ${currentTab === 'audit' ? 'active' : ''}" onclick="window.app.switchStaffTab('audit')">
          📊 Activity Audit Trail & Logs
        </button>
        <button class="merchant-tab-btn" style="background:var(--navy-50); color:var(--navy-900); font-weight:700;" onclick="window.app.route('reports')">
          📈 Reports & Analytics ➔
        </button>
      </div>

      <!-- Tab Body Container -->
      <div style="background:var(--white); border-radius:var(--radius-xl); padding:28px; border:1px solid var(--slate-200); box-shadow:var(--shadow-sm); min-height:420px;">
        ${tabContentHtml}
      </div>
    `;
  }

  // Interactive Staff & Ticket Controls
  function switchStaffTab(tabName) {
    state.staffWorkspaceTab = tabName;
    loadStaffWorkspace();
  }

  function filterStaffCases(filterType) {
    state.staffFilter = filterType;
    loadStaffWorkspace();
  }

  function claimStaffTicket(caseId) {
    const currentName = state.currentUser ? state.currentUser.name : 'Auditor Roberto Santos';
    const currentId = state.currentUser ? state.currentUser.id : 'STF-AUD-001';
    
    const targetCase = (state.staffCases || []).find(c => c.id === caseId);
    if (targetCase) {
      targetCase.assigned_to = currentName;
      targetCase.assigned_id = currentId;
      targetCase.workflow_status = 'UNDER REVIEW';
    }

    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: currentName,
        action: 'CLAIMED_TICKET',
        entity: caseId,
        details: `Assigned verification ticket ${caseId} to self for detailed regulatory review.`,
        hash: '2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d'
      });
    }

    showToast(`✓ Ticket ${caseId} claimed by ${currentName}! Status updated to Under Review.`, 'success');
    loadStaffWorkspace();
  }

  function reassignStaffTicket(caseId, targetStaffId, targetStaffName) {
    if (!targetStaffId) return;
    const cleanStaffName = (targetStaffName || '').replace(/\s*\(.*\)/, '').trim();

    const targetCase = (state.staffCases || []).find(c => c.id === caseId);
    if (targetCase) {
      targetCase.assigned_to = cleanStaffName;
      targetCase.assigned_id = targetStaffId;
    }

    const currentName = state.currentUser ? state.currentUser.name : 'Executive Director';

    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: currentName,
        action: 'REASSIGNED_CASE',
        entity: caseId,
        details: `Reassigned verification application ${caseId} to [${cleanStaffName}].`,
        hash: '4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b'
      });
    }

    showToast(`Case ${caseId} successfully reassigned to ${cleanStaffName}.`, 'info');
    loadStaffWorkspace();
  }

  function updateCaseWorkflowStatus(caseId, newStatus) {
    const targetCase = (state.staffCases || []).find(c => c.id === caseId);
    if (targetCase) {
      targetCase.workflow_status = newStatus;
    }
    showToast(`Workflow status for ${caseId} changed to ${newStatus}.`, 'info');
  }

  // Staff CRUD and Modal Handlers
  function openStaffInviteModal() {
    openModal('modal-staff-invite');
  }

  function submitStaffInvite() {
    const name = document.getElementById('staff-invite-name')?.value.trim();
    const email = document.getElementById('staff-invite-email')?.value.trim();
    const roleId = document.getElementById('staff-invite-role')?.value;
    const requireMFA = document.getElementById('staff-invite-mfa')?.checked;
    const sendEmail = document.getElementById('staff-invite-send-email')?.checked;

    if (!name || !email) {
      showToast('Name and work email are required.', 'error');
      return;
    }

    const roleNameMap = {
      super_admin: 'Super Administrator',
      admin: 'Compliance Director (Admin)',
      auditor: 'Lead Compliance Auditor',
      verifier: 'KYC & DTI Verification Specialist',
      support: 'Support Concierge & Dispute Agent'
    };

    const newStaff = {
      id: `STF-${Math.floor(100 + Math.random() * 900)}`,
      name,
      email,
      roleId,
      roleName: roleNameMap[roleId] || 'Auditor',
      status: 'active',
      requireMFA: !!requireMFA,
      lastLogin: 'Pending First Sign-In',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
    };

    state.staffMembers.push(newStaff);

    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: state.currentUser ? state.currentUser.name : 'Director Alejandro Cruz',
        action: 'STAFF_INVITATION_SENT',
        entity: email,
        details: `Provisioned account for ${name} (${email}) with role [${roleNameMap[roleId]}]. Supabase Auth invite link generated.`,
        hash: '6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f'
      });
    }

    closeModal('modal-staff-invite');
    document.getElementById('form-staff-invite')?.reset();
    showToast(`✓ Staff member ${name} invited! Automated Supabase Auth email invitation triggered.`, 'success');
    loadStaffWorkspace();
  }

  function openStaffEditModal(staffId) {
    const staff = (state.staffMembers || []).find(m => m.id === staffId);
    if (!staff) return;

    const idInput = document.getElementById('staff-edit-id');
    const nameInput = document.getElementById('staff-edit-name');
    const emailInput = document.getElementById('staff-edit-email');
    const roleSelect = document.getElementById('staff-edit-role');
    const statusSelect = document.getElementById('staff-edit-status');
    const mfaCheckbox = document.getElementById('staff-edit-mfa');

    if (idInput) idInput.value = staff.id;
    if (nameInput) nameInput.value = staff.name;
    if (emailInput) emailInput.value = staff.email;
    if (roleSelect) roleSelect.value = staff.roleId || 'auditor';
    if (statusSelect) statusSelect.value = staff.status || 'active';
    if (mfaCheckbox) mfaCheckbox.checked = !!staff.requireMFA;

    openModal('modal-staff-edit');
  }

  function submitStaffEdit() {
    const staffId = document.getElementById('staff-edit-id')?.value;
    const name = document.getElementById('staff-edit-name')?.value.trim();
    const roleId = document.getElementById('staff-edit-role')?.value;
    const status = document.getElementById('staff-edit-status')?.value;
    const requireMFA = document.getElementById('staff-edit-mfa')?.checked;

    const staff = (state.staffMembers || []).find(m => m.id === staffId);
    if (!staff) return;

    const roleNameMap = {
      super_admin: 'Super Administrator',
      admin: 'Compliance Director (Admin)',
      auditor: 'Lead Compliance Auditor',
      verifier: 'KYC & DTI Verification Specialist',
      support: 'Support Concierge & Dispute Agent'
    };

    staff.name = name || staff.name;
    staff.roleId = roleId;
    staff.roleName = roleNameMap[roleId] || staff.roleName;
    staff.status = status;
    staff.requireMFA = !!requireMFA;

    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: state.currentUser ? state.currentUser.name : 'Director Alejandro Cruz',
        action: 'STAFF_UPDATED',
        entity: staff.email,
        details: `Updated role to [${roleNameMap[roleId]}], status: ${status}, MFA: ${requireMFA ? 'Enforced' : 'Optional'}.`,
        hash: '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a'
      });
    }

    closeModal('modal-staff-edit');
    showToast(`✓ Profile & role for ${staff.name} successfully updated!`, 'success');
    loadStaffWorkspace();
  }

  function deleteStaffAccount(staffId, staffName) {
    if (state.currentUser && state.currentUser.id === staffId) {
      showToast('Cannot delete your own active administrative account.', 'error');
      return;
    }

    state.staffMembers = state.staffMembers.filter(m => m.id !== staffId);

    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: state.currentUser ? state.currentUser.name : 'Director Alejandro Cruz',
        action: 'STAFF_DELETED',
        entity: staffName || staffId,
        details: `Revoked access credentials and deactivated staff account ${staffId}.`,
        hash: '8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b'
      });
    }

    showToast(`Staff account for ${staffName || staffId} deleted and revoked.`, 'info');
    loadStaffWorkspace();
  }

  function deleteStaffFromEditModal() {
    const staffId = document.getElementById('staff-edit-id')?.value;
    const name = document.getElementById('staff-edit-name')?.value;
    closeModal('modal-staff-edit');
    deleteStaffAccount(staffId, name);
  }

  function resetStaffAccountPassword(staffId, staffName) {
    showToast(`🔑 Automated password reset link dispatched to ${staffName}'s work email.`, 'success');
    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: state.currentUser ? state.currentUser.name : 'Director Alejandro Cruz',
        action: 'PASSWORD_RESET_DISPATCHED',
        entity: staffName || staffId,
        details: `Issued 15-minute temporary password reset token for ${staffName}.`,
        hash: '9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c'
      });
    }
  }

  function triggerStaffPasswordResetModal() {
    const name = document.getElementById('staff-edit-name')?.value;
    const id = document.getElementById('staff-edit-id')?.value;
    resetStaffAccountPassword(id, name);
  }

  function refreshLiveAuditLogs() {
    showToast('🔄 Synchronized with VeriPinoy Cryptographic Audit Engine', 'success');
    loadStaffWorkspace();
  }

  function approveStaffCase(caseId, targetName) {
    showToast(`✓ Case ${caseId} Approved! Official VeriPinoy Verified Trustmark issued to ${targetName || 'applicant'}.`, 'success');
    
    // Add to cryptographic audit ledger
    if (state.staffAuditLedger) {
      state.staffAuditLedger.unshift({
        id: `AUD-LOG-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) + ' PHT',
        actor: state.currentUser ? state.currentUser.name : 'Auditor Roberto Santos (STF-8812)',
        action: 'APPROVED_VERIFICATION_BADGE',
        entity: targetName || caseId,
        details: `Approved verification documents for ${caseId}. Trustmark seal granted.`,
        hash: 'b7c9e2f4a6b8d0c2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8e0'
      });
    }

    state.staffCases = state.staffCases.filter(c => c.id !== caseId);
    loadStaffWorkspace();
  }

  function rejectStaffCase(caseId, targetName) {
    showToast(`Application ${caseId} for ${targetName || 'entity'} marked as rejected. Official notice dispatched.`, 'warning');
    state.staffCases = state.staffCases.filter(c => c.id !== caseId);
    loadStaffWorkspace();
  }

  function requestStaffResubmission(caseId, targetName) {
    showToast(`Clarification request sent to ${targetName || 'applicant'} for Case ${caseId}. 72-hour window opened.`, 'info');
  }

  function dismissFraudAlert(alertId) {
    showToast(`Fraud alert ${alertId} reviewed and marked as false positive.`, 'info');
    state.staffFraudAlerts = state.staffFraudAlerts.filter(a => a.id !== alertId);
    loadStaffWorkspace();
  }

  function quarantineFraudAlert(alertId, targetName) {
    showToast(`Flagged activity on ${targetName} quarantined. Official compliance warning dispatched to account owner.`, 'success');
    state.staffFraudAlerts = state.staffFraudAlerts.filter(a => a.id !== alertId);
    loadStaffWorkspace();
  }

  function resolveStaffDispute(disputeId, decision) {
    if (decision === 'release') {
      showToast(`Dispute ${disputeId} resolved in favor of Freelancer. Escrow funds transferred via UnionBank InstaPay!`, 'success');
    } else if (decision === 'refund') {
      showToast(`Dispute ${disputeId} resolved in favor of Client. 100% Escrow refund credited to buyer account.`, 'info');
    } else {
      showToast(`Dispute ${disputeId} arbitrated as 50/50 split settlement. Mutual payouts disbursed.`, 'success');
    }
    state.staffDisputes = state.staffDisputes.filter(d => d.id !== disputeId);
    loadStaffWorkspace();
  }

  function exportStaffAuditLedger() {
    const rows = [
      ['Timestamp', 'Operator', 'Action Code', 'Target Entity', 'Details', 'SHA-256 Hash']
    ];
    (state.staffAuditLedger || []).forEach(log => {
      rows.push([log.timestamp, log.actor, log.action, log.entity, log.details, log.hash]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(i => `"${String(i).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VeriPinoy_Compliance_Audit_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Compliance audit ledger successfully exported to CSV!', 'success');
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

  // =========================================================================
  // FREQUENTLY ASKED QUESTIONS (FAQS) & GOVERNMENT REQUIREMENTS CONTROLLER
  // =========================================================================
  function openFaqModal(categoryKey = 'gov') {
    openModal('modal-faq');
    switchFaqCategory(categoryKey);
    const searchInput = document.getElementById('faq-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
  }

  function switchFaqCategory(categoryKey) {
    // Update active tab buttons
    document.querySelectorAll('.faq-category-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const targetBtn = document.getElementById(`faq-tab-${categoryKey}`);
    if (targetBtn) {
      targetBtn.classList.add('active');
    }

    const items = document.querySelectorAll('.faq-item');
    let visibleCount = 0;

    items.forEach(item => {
      const itemCat = item.getAttribute('data-category');
      if (categoryKey === 'all' || itemCat === categoryKey) {
        item.style.display = 'block';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });

    const countEl = document.getElementById('faq-search-count');
    if (countEl) {
      countEl.textContent = `${visibleCount} FAQ${visibleCount === 1 ? '' : 's'}`;
    }
  }

  function toggleFaqItem(faqItemId) {
    const item = document.getElementById(faqItemId);
    if (!item) return;
    const wasActive = item.classList.contains('active');
    
    if (wasActive) {
      item.classList.remove('active');
    } else {
      item.classList.add('active');
    }
  }

  function filterFaqItems(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('.faq-item');
    let matchCount = 0;

    if (!q) {
      // Find currently active category
      const activeBtn = document.querySelector('.faq-category-btn.active');
      const activeCat = activeBtn ? activeBtn.id.replace('faq-tab-', '') : 'gov';
      switchFaqCategory(activeCat);
      return;
    }

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(q)) {
        item.style.display = 'block';
        item.classList.add('active'); // auto expand matching accordion items
        matchCount++;
      } else {
        item.style.display = 'none';
        item.classList.remove('active');
      }
    });

    const countEl = document.getElementById('faq-search-count');
    if (countEl) {
      countEl.textContent = `${matchCount} match${matchCount === 1 ? '' : 'es'}`;
    }
  }

  function handleContactFormSubmit(formEl) {
    if (formEl) {
      formEl.reset();
    }
    closeModal('modal-contact');
    showToast('Your message has been submitted to VeriPinoy Consumer Assistance. A compliance specialist will respond within 24 hours.', 'success');
  }

  /* ==========================================================================
     ROLE-BASED REPORTING & ANALYTICS MODULE (Auditors, Sales, Admin, Super Admin)
     ========================================================================== */

  // State for role reporting
  state.reportsPerspective = null; // 'auditor' | 'sales' | 'admin' | 'super_admin'
  state.reportsData = null;
  state.auditorActionFilter = 'ALL';
  state.auditorKeyword = '';
  state.auditorRiskFilter = 'ALL';
  state.salesStageFilter = 'ALL';
  state.salesCityFilter = 'ALL';

  function exportReportFile(type, format) {
    const cleanType = type || 'auditor';
    const cleanFormat = format || 'csv';
    const exportUrl = `/api/reports/export?type=${encodeURIComponent(cleanType)}&format=${encodeURIComponent(cleanFormat)}`;
    
    showToast(`⏳ Generating official VeriPinoy ${cleanFormat.toUpperCase()} report...`, 'info');
    
    const downloadLink = document.createElement('a');
    downloadLink.href = exportUrl;
    downloadLink.target = '_blank';
    downloadLink.download = `VeriPinoy_${cleanType}_Report.${cleanFormat}`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      showToast(`✓ ${cleanFormat.toUpperCase()} report exported successfully!`, 'success');
    }, 400);
  }

  function switchReportsRolePerspective(newRole) {
    state.reportsPerspective = newRole;
    loadRoleBasedReports();
  }

  function setAuditorFilterAction(action) {
    state.auditorActionFilter = action;
    loadRoleBasedReports();
  }

  function setAuditorSearchKeyword(kw) {
    state.auditorKeyword = kw;
    loadRoleBasedReports();
  }

  function setAuditorRiskFilter(risk) {
    state.auditorRiskFilter = risk;
    loadRoleBasedReports();
  }

  function setSalesStageFilter(stage) {
    state.salesStageFilter = stage;
    loadRoleBasedReports();
  }

  function setSalesCityFilter(city) {
    state.salesCityFilter = city;
    loadRoleBasedReports();
  }

  async function advancePipelineStage(pipelineId, nextStage) {
    showToast(`✓ Pipeline deal ${pipelineId} progressed to [${nextStage.replace(/_/g, ' ').toUpperCase()}]!`, 'success');
    if (state.reportsData && state.reportsData.pipeline) {
      const deal = state.reportsData.pipeline.find(p => p.id === pipelineId);
      if (deal) deal.stage = nextStage;
    }
    loadRoleBasedReports();
  }

  async function loadRoleBasedReports(explicitRole) {
    const container = document.getElementById('role-reports-container');
    if (!container) return;

    const user = state.currentUser;
    let activeRole = (explicitRole || state.reportsPerspective || (user ? user.role : 'auditor')).toLowerCase();

    // Map general roles to reporting module roles
    if (activeRole === 'staff') activeRole = 'auditor';
    if (activeRole === 'admin' && !state.reportsPerspective) activeRole = 'admin';
    if (!['auditor', 'sales', 'admin', 'super_admin'].includes(activeRole)) {
      activeRole = 'auditor';
    }

    const isSuperAdminOrAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

    // Show loading state
    container.innerHTML = `
      <div style="text-align:center; padding:64px; background:var(--white); border-radius:var(--radius-xl); border:1px solid var(--slate-200);">
        <div style="font-size:2.5rem; margin-bottom:12px; animation:spin 1s linear infinite;">⏳</div>
        <h3 style="font-family:var(--font-heading); font-size:1.4rem; font-weight:800; color:var(--navy-900);">Loading Tailored Analytics & Reports...</h3>
        <p style="font-size:0.85rem; color:var(--slate-500);">Fetching cryptographically signed metrics and RBAC records.</p>
      </div>
    `;

    try {
      let endpoint = '/api/reports/auditor';
      if (activeRole === 'sales') endpoint = '/api/reports/sales';
      else if (activeRole === 'admin' || activeRole === 'super_admin') endpoint = '/api/reports/admin';

      const resp = await fetch(endpoint);
      const data = await resp.json();
      state.reportsData = data;

      let viewContentHtml = '';

      // Perspective switcher header for Admins / Super Admins
      const perspectiveBarHtml = isSuperAdminOrAdmin ? `
        <div style="background:var(--slate-100); border:1px solid var(--slate-200); border-radius:var(--radius-lg); padding:8px 12px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge badge-navy" style="font-size:0.7rem;">👑 RBAC PERSPECTIVE SELECTOR</span>
            <span style="font-size:0.8rem; color:var(--slate-600);">You have full multi-departmental clearance:</span>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ${activeRole === 'admin' || activeRole === 'super_admin' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem;" onclick="window.app.switchReportsRolePerspective('super_admin')">
              🏛️ Executive Director Master View
            </button>
            <button class="btn ${activeRole === 'auditor' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem;" onclick="window.app.switchReportsRolePerspective('auditor')">
              🔍 Auditor Compliance View
            </button>
            <button class="btn ${activeRole === 'sales' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 12px; font-size:0.75rem;" onclick="window.app.switchReportsRolePerspective('sales')">
              📈 Sales Pipeline & Growth View
            </button>
          </div>
        </div>
      ` : '';

      // =========================================================================
      // 1. AUDITOR REPORT VIEW
      // =========================================================================
      if (activeRole === 'auditor') {
        const kpis = data.kpis || {};
        let auditLogs = data.auditLogs || [];
        let cardoAudits = data.cardoAudits || [];
        const securityChecks = data.securityChecks || [];

        // Apply UI Filters
        if (state.auditorActionFilter && state.auditorActionFilter !== 'ALL') {
          auditLogs = auditLogs.filter(l => (l.action || '').toUpperCase().includes(state.auditorActionFilter));
        }
        if (state.auditorKeyword) {
          const kw = state.auditorKeyword.toLowerCase();
          auditLogs = auditLogs.filter(l =>
            (l.actor_name || '').toLowerCase().includes(kw) ||
            (l.action || '').toLowerCase().includes(kw) ||
            (l.entity_type || '').toLowerCase().includes(kw) ||
            (l.details || '').toLowerCase().includes(kw)
          );
        }
        if (state.auditorRiskFilter && state.auditorRiskFilter !== 'ALL') {
          cardoAudits = cardoAudits.filter(c => c.risk_level === state.auditorRiskFilter);
        }

        viewContentHtml = `
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color:var(--white); border-radius:var(--radius-xl); padding:32px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.1); box-shadow:var(--shadow-md);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="badge badge-emerald" style="font-size:0.75rem;">AUDITOR ROLE CLEARANCE</span>
                  <span class="badge badge-gold" style="font-size:0.75rem;">BSP CIRCULAR 942 & PH DPA RA 10173</span>
                </div>
                <h1 style="font-family:var(--font-heading); font-size:2rem; font-weight:900; color:var(--white); margin:0 0 6px;">
                  Compliance, Security & Audit Directorate Report
                </h1>
                <p style="font-size:0.88rem; color:var(--slate-300); max-width:740px; margin:0; line-height:1.5;">
                  Comprehensive audit trail logs, statutory DTI/SEC registration verification status, BIR 2303 tax compliance tracking, and automated cryptographic integrity checks.
                </p>
              </div>

              <!-- Export Actions Toolbar -->
              <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">DOWNLOAD OFFICIAL AUDIT REPORT</div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('audit_trail', 'csv')">
                    📄 Export CSV
                  </button>
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('audit_trail', 'xlsx')">
                    📊 Export Excel (.xlsx)
                  </button>
                  <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.78rem; font-weight:800;" onclick="window.app.exportReportFile('audit_trail', 'pdf')">
                    📕 Export Official PDF
                  </button>
                </div>
              </div>
            </div>

            <!-- Auditor KPI Metrics Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:14px; margin-top:24px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">TOTAL AUDIT EVENTS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">${kpis.total_audit_events || '1,496'}</div>
                <div style="font-size:0.72rem; color:var(--emerald-400);">Immutable Merkle Chain</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">DTI/SEC VERIFIED RATE</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.verified_compliance_rate || '96%'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Active Registrations</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">AI CONFIDENCE AVG</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--blue-400); margin:2px 0;">${kpis.avg_ai_confidence || '98.5%'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">C.A.R.D.O. Automated Audits</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">PENDING RENEWALS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">${kpis.pending_audits || 3} Cases</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Requires Filing Review</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">HIGH-RISK FLAGS</div>
                <div style="font-size:1.6rem; font-weight:900; color:#FB7185; margin:2px 0;">${kpis.high_risk_flags || 1} Flagged</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Quarantine Activated</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">MFA ENFORCEMENT</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">100%</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Hardware FIDO2 Active</div>
              </div>
            </div>
          </div>

          <!-- Section 1: Automated Security & Integrity Checks -->
          <div style="margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Automated Security & Integrity Checks</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Real-time automated diagnostic suites monitoring tamper detection, Separation of Duties, and DPA compliance.</p>
              </div>
              <span class="badge badge-emerald" style="font-size:0.75rem;">ALL 4 SYSTEMS OPERATIONAL</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
              ${securityChecks.map(sc => `
                <div class="vp-card" style="padding:16px; border-radius:var(--radius-lg); background:var(--white); border:1px solid var(--slate-200);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong style="font-size:0.88rem; color:var(--navy-900);">${escapeHtml(sc.check_name)}</strong>
                    <span class="badge ${sc.status === 'PASSED' || sc.status === 'COMPLIANT' || sc.status === 'ACTIVE' || sc.status === 'ENFORCED' ? 'badge-emerald' : 'badge-gold'}" style="font-size:0.68rem;">
                      ● ${sc.status}
                    </span>
                  </div>
                  <p style="font-size:0.78rem; color:var(--slate-600); margin:0 0 8px; line-height:1.4;">${escapeHtml(sc.details)}</p>
                  <div style="font-size:0.7rem; color:var(--slate-400);">Last Verified: ${sc.last_run}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section 2: Audit Trail Log Summary Table -->
          <div class="vp-card" style="padding:24px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200); margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Audit Trail Log Summary (audit_logs)</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Tracking sensitive actions including status modifications, account deletions, role elevation, and verification approvals.</p>
              </div>

              <!-- Search and Filter Bar -->
              <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <input type="text" class="input-field" placeholder="Search actor, action, or entity..." value="${escapeHtml(state.auditorKeyword || '')}" oninput="window.app.setAuditorSearchKeyword(this.value)" style="width:220px; padding:6px 10px; font-size:0.78rem;">
                <select class="input-field" style="padding:6px 10px; font-size:0.78rem;" onchange="window.app.setAuditorFilterAction(this.value)">
                  <option value="ALL" ${state.auditorActionFilter === 'ALL' ? 'selected' : ''}>All Actions</option>
                  <option value="APPROVED" ${state.auditorActionFilter === 'APPROVED' ? 'selected' : ''}>Approvals</option>
                  <option value="ROLE" ${state.auditorActionFilter === 'ROLE' ? 'selected' : ''}>Role Changes</option>
                  <option value="CLAIMED" ${state.auditorActionFilter === 'CLAIMED' ? 'selected' : ''}>Ticket Claims</option>
                  <option value="DELETED" ${state.auditorActionFilter === 'DELETED' ? 'selected' : ''}>Deletions</option>
                  <option value="STATUS" ${state.auditorActionFilter === 'STATUS' ? 'selected' : ''}>Status Changes</option>
                </select>
                <button class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem;" onclick="window.app.exportReportFile('audit_trail', 'csv')">
                  📥 CSV
                </button>
              </div>
            </div>

            <!-- Table -->
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                <thead>
                  <tr style="background:var(--slate-50); border-bottom:2px solid var(--slate-200);">
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">TIMESTAMP</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ACTOR & ROLE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ACTION CODE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">TARGET ENTITY</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">PREVIOUS → NEW VALUE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">DETAILS</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">SHA-256 HASH</th>
                  </tr>
                </thead>
                <tbody>
                  ${auditLogs.length === 0 ? `
                    <tr><td colspan="7" style="padding:32px; text-align:center; color:var(--slate-500);">No audit log events match the current filter.</td></tr>
                  ` : auditLogs.slice(0, 25).map(log => `
                    <tr style="border-bottom:1px solid var(--slate-100);">
                      <td style="padding:10px 12px; white-space:nowrap; color:var(--slate-600);">${log.timestamp}</td>
                      <td style="padding:10px 12px;">
                        <strong style="color:var(--navy-900);">${escapeHtml(log.actor_name || 'System')}</strong>
                        <div style="font-size:0.7rem; color:var(--slate-400);">${escapeHtml(log.actor_role || 'staff')}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <span class="badge badge-navy" style="font-size:0.68rem;">${log.action}</span>
                      </td>
                      <td style="padding:10px 12px; font-weight:600;">${escapeHtml(log.entity_id || log.entity_type || '-')}</td>
                      <td style="padding:10px 12px; font-size:0.75rem; color:var(--slate-600);">
                        ${log.previous_value ? `<span style="color:#BE123C;">${escapeHtml(log.previous_value)}</span> → ` : ''}
                        <span style="color:#047857; font-weight:700;">${escapeHtml(log.new_value || '-')}</span>
                      </td>
                      <td style="padding:10px 12px; color:var(--slate-700); max-width:260px;">${escapeHtml(log.details)}</td>
                      <td style="padding:10px 12px; font-family:monospace; font-size:0.68rem; color:var(--slate-400);">${(log.ip_address || '127.0.0.1')} • ${(log.id || '').slice(0, 8)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: C.A.R.D.O. Compliance Status Breakdown -->
          <div class="vp-card" style="padding:24px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">C.A.R.D.O. Compliance Status Breakdown (cardo_compliance_audits)</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Automated risk profiling, DTI/SEC registration verification, BIR Form 2303, and Mayor's Permit compliance records.</p>
              </div>

              <div style="display:flex; gap:8px; align-items:center;">
                <select class="input-field" style="padding:6px 10px; font-size:0.78rem;" onchange="window.app.setAuditorRiskFilter(this.value)">
                  <option value="ALL" ${state.auditorRiskFilter === 'ALL' ? 'selected' : ''}>All Risk Levels</option>
                  <option value="LOW" ${state.auditorRiskFilter === 'LOW' ? 'selected' : ''}>Low Risk Clearance</option>
                  <option value="MODERATE" ${state.auditorRiskFilter === 'MODERATE' ? 'selected' : ''}>Moderate Risk</option>
                  <option value="HIGH" ${state.auditorRiskFilter === 'HIGH' ? 'selected' : ''}>High Risk Flags</option>
                </select>
                <button class="btn btn-emerald" style="padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('cardo_compliance', 'xlsx')">
                  📊 Export Compliance Matrix (.xlsx)
                </button>
              </div>
            </div>

            <!-- Compliance Table -->
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                <thead>
                  <tr style="background:var(--slate-50); border-bottom:2px solid var(--slate-200);">
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">BUSINESS / FREELANCER</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">DTI / SEC REG NO.</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">DTI/SEC STATUS</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">AI CONFIDENCE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">BIR 2303 TAX</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">MAYOR'S PERMIT</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">RISK PROFILE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">AUDITED AT</th>
                  </tr>
                </thead>
                <tbody>
                  ${cardoAudits.map(a => `
                    <tr style="border-bottom:1px solid var(--slate-100);">
                      <td style="padding:10px 12px; font-weight:700; color:var(--navy-900);">${escapeHtml(a.business_name)}</td>
                      <td style="padding:10px 12px; font-family:monospace; font-size:0.75rem;">${escapeHtml(a.dti_sec_reg_no)}</td>
                      <td style="padding:10px 12px;">
                        <span class="badge ${a.dti_sec_status === 'verified_active' ? 'badge-emerald' : a.dti_sec_status === 'under_investigation' ? 'badge-gold' : 'badge-navy'}" style="font-size:0.68rem;">
                          ${(a.dti_sec_status || 'VERIFIED').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style="padding:10px 12px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                          <strong style="color:var(--navy-900);">${a.cardo_ai_confidence}%</strong>
                          <div style="width:48px; height:6px; background:var(--slate-200); border-radius:3px; overflow:hidden;">
                            <div style="width:${a.cardo_ai_confidence}%; height:100%; background:var(--emerald-500);"></div>
                          </div>
                        </div>
                      </td>
                      <td style="padding:10px 12px; font-size:0.75rem;">
                        <span style="color:${a.bir_2303_status === 'verified_tax_compliant' ? '#047857' : '#B45309'}; font-weight:600;">
                          ${a.bir_2303_status === 'verified_tax_compliant' ? '✓ Compliant' : '⚠️ Pending'}
                        </span>
                      </td>
                      <td style="padding:10px 12px; font-size:0.75rem;">
                        <span style="color:${a.mayors_permit_status === 'verified_valid' ? '#047857' : '#B45309'}; font-weight:600;">
                          ${a.mayors_permit_status === 'verified_valid' ? '✓ Valid' : '⚠️ Renewal'}
                        </span>
                      </td>
                      <td style="padding:10px 12px;">
                        <span class="badge ${a.risk_level === 'LOW' ? 'badge-emerald' : a.risk_level === 'MODERATE' ? 'badge-gold' : 'badge-navy'}" style="font-size:0.68rem; ${a.risk_level === 'HIGH' ? 'background:#BE123C; color:#fff;' : ''}">
                          ${a.risk_level} RISK
                        </span>
                      </td>
                      <td style="padding:10px 12px; font-size:0.72rem; color:var(--slate-500);">${a.last_audited_at}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // =========================================================================
      // 2. SALES TEAM REPORT VIEW
      // =========================================================================
      else if (activeRole === 'sales') {
        const kpis = data.kpis || {};
        let pipeline = data.pipeline || [];
        const referrals = data.referrals || [];
        const categoryDist = data.categoryDistribution || [];
        const regionalDist = data.regionalDistribution || [];
        const engagement = data.merchantEngagement || {};
        const stageCounts = data.stageCounts || {};

        if (state.salesStageFilter && state.salesStageFilter !== 'ALL') {
          pipeline = pipeline.filter(p => p.stage === state.salesStageFilter);
        }
        if (state.salesCityFilter && state.salesCityFilter !== 'ALL') {
          pipeline = pipeline.filter(p => p.city === state.salesCityFilter);
        }

        viewContentHtml = `
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%); color:var(--white); border-radius:var(--radius-xl); padding:32px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.1); box-shadow:var(--shadow-md);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="badge badge-gold" style="font-size:0.75rem;">SALES TEAM ROLE CLEARANCE</span>
                  <span class="badge badge-emerald" style="font-size:0.75rem;">COMMERCIAL ACQUISITION & PARTNERSHIPS</span>
                </div>
                <h1 style="font-family:var(--font-heading); font-size:2rem; font-weight:900; color:var(--white); margin:0 0 6px;">
                  Merchant Acquisition Pipeline & Growth Report
                </h1>
                <p style="font-size:0.88rem; color:var(--slate-300); max-width:740px; margin:0; line-height:1.5;">
                  Live visibility into deal stages, referral partner commissions, conversion performance, and Philippine regional merchant growth metrics.
                </p>
              </div>

              <!-- Export Actions Toolbar -->
              <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">EXPORT COMMERCIAL REPORT</div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('pipeline', 'csv')">
                    📄 Pipeline CSV
                  </button>
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('referrals', 'xlsx')">
                    📊 Referrals (.xlsx)
                  </button>
                  <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.78rem; font-weight:800;" onclick="window.app.exportReportFile('sales', 'pdf')">
                    📕 Full Commercial PDF
                  </button>
                </div>
              </div>
            </div>

            <!-- Sales KPI Metrics Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:14px; margin-top:24px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">TOTAL PIPELINE VALUE</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">₱${(kpis.pipeline_total_value || 490000).toLocaleString()}</div>
                <div style="font-size:0.72rem; color:var(--emerald-400);">Active Deal Value</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">FUNNEL CONVERSION RATE</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.pipeline_conversion_rate || '33%'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Lead to Verified Merchant</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">REFERRAL PARTNER LEADS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--blue-400); margin:2px 0;">${kpis.total_referral_leads || 31} Leads</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">${kpis.overall_referral_conversion_rate || '77.4%'} Conversion</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">TOTAL COMMISSIONS EARNED</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">₱${(kpis.total_commissions_earned || 24000).toLocaleString()}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">₱${(kpis.total_commissions_paid || 18000).toLocaleString()} Disbursed</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">AVERAGE DEAL SIZE</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">${kpis.average_deal_size || '₱4,100'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Verified Spotlights</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">ACTIVE MERCHANTS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.active_merchants_in_funnel || 6} in Pipeline</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Target: 25 MoM</div>
              </div>
            </div>
          </div>

          <!-- Section 1: Merchant Acquisition Pipeline Funnel Stages -->
          <div style="margin-bottom:28px;">
            <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0 0 12px;">Merchant Acquisition Pipeline Funnel</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:10px;">
              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid var(--slate-400);">
                <div style="font-size:0.7rem; font-weight:800; color:var(--slate-500); text-transform:uppercase;">1. LEAD INGESTION</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.lead_ingestion || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">Cold Outreach</div>
              </div>

              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid var(--blue-500);">
                <div style="font-size:0.7rem; font-weight:800; color:var(--blue-600); text-transform:uppercase;">2. INITIAL OUTREACH</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.initial_outreach || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">Pitch Presentation</div>
              </div>

              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid var(--amber-500);">
                <div style="font-size:0.7rem; font-weight:800; color:var(--amber-700); text-transform:uppercase;">3. DOC SUBMISSION</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.doc_submission || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">BIR & Permits</div>
              </div>

              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid #8B5CF6;">
                <div style="font-size:0.7rem; font-weight:800; color:#7C3AED; text-transform:uppercase;">4. KYB UNDER REVIEW</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.kyb_under_review || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--slate-500);">Auditor Desk</div>
              </div>

              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid var(--emerald-500);">
                <div style="font-size:0.7rem; font-weight:800; color:var(--emerald-700); text-transform:uppercase;">5. VERIFIED ONBOARDED</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.verified_onboarded || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--emerald-600);">Trustmark Issued</div>
              </div>

              <div class="vp-card" style="padding:14px; border-radius:var(--radius-lg); background:var(--white); border-top:4px solid var(--navy-900);">
                <div style="font-size:0.7rem; font-weight:800; color:var(--navy-900); text-transform:uppercase;">6. SPOTLIGHT CONVERTED</div>
                <div style="font-size:1.4rem; font-weight:900; color:var(--navy-900); margin:2px 0;">${stageCounts.spotlight_converted || 1} Deals</div>
                <div style="font-size:0.75rem; color:var(--emerald-600);">Paid Featured Pro</div>
              </div>
            </div>
          </div>

          <!-- Section 2: Merchant Pipeline Table -->
          <div class="vp-card" style="padding:24px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200); margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Active Merchant Deals (merchant_pipeline)</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Tracking onboarding milestones and assigned sales reps.</p>
              </div>

              <div style="display:flex; gap:8px; align-items:center;">
                <select class="input-field" style="padding:6px 10px; font-size:0.78rem;" onchange="window.app.setSalesStageFilter(this.value)">
                  <option value="ALL">All Stages</option>
                  <option value="lead_ingestion">Lead Ingestion</option>
                  <option value="initial_outreach">Initial Outreach</option>
                  <option value="doc_submission">Doc Submission</option>
                  <option value="kyb_under_review">KYB Review</option>
                  <option value="verified_onboarded">Verified Onboarded</option>
                  <option value="spotlight_converted">Spotlight Converted</option>
                </select>
                <button class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem;" onclick="window.app.exportReportFile('pipeline', 'csv')">
                  📥 CSV
                </button>
              </div>
            </div>

            <!-- Table -->
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                <thead>
                  <tr style="background:var(--slate-50); border-bottom:2px solid var(--slate-200);">
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">MERCHANT NAME</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">OWNER & CITY</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">DEAL VALUE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">STAGE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">REFERRAL SOURCE</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ASSIGNED REP</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900); text-align:right;">ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  ${pipeline.map(p => `
                    <tr style="border-bottom:1px solid var(--slate-100);">
                      <td style="padding:10px 12px;">
                        <strong style="color:var(--navy-900); font-size:0.85rem;">${escapeHtml(p.business_name)}</strong>
                        <div style="font-size:0.72rem; color:var(--slate-500);">${escapeHtml(p.industry)}</div>
                      </td>
                      <td style="padding:10px 12px;">
                        <div>${escapeHtml(p.owner_name)}</div>
                        <div style="font-size:0.72rem; color:var(--slate-400);">${escapeHtml(p.city)}</div>
                      </td>
                      <td style="padding:10px 12px; font-weight:800; color:var(--emerald-600);">₱${(p.deal_value || 0).toLocaleString()}</td>
                      <td style="padding:10px 12px;">
                        <span class="badge ${p.stage === 'spotlight_converted' ? 'badge-gold' : p.stage === 'verified_onboarded' ? 'badge-emerald' : 'badge-blue'}" style="font-size:0.68rem;">
                          ${(p.stage || '').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style="padding:10px 12px; font-size:0.75rem; color:var(--slate-600);">
                        ${escapeHtml(p.referral_source || 'Direct Inbound')}
                        ${p.referral_code ? `<br><code style="font-size:0.68rem;">${escapeHtml(p.referral_code)}</code>` : ''}
                      </td>
                      <td style="padding:10px 12px; font-size:0.78rem; font-weight:600;">${escapeHtml(p.assigned_sales_rep || 'Camille Dizon')}</td>
                      <td style="padding:10px 12px; text-align:right;">
                        <button class="btn btn-outline" style="padding:4px 8px; font-size:0.72rem;" onclick="window.app.advancePipelineStage('${p.id}', 'verified_onboarded')">
                          Advance ➔
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: Referral Partner Performance & Distribution -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px; margin-bottom:28px;">
            <!-- Referral Program Performance -->
            <div class="vp-card" style="padding:22px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy-900); margin:0;">Referral Partner Performance</h3>
                <span class="badge badge-emerald" style="font-size:0.7rem;">4 ACTIVE PARTNERS</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${referrals.map(r => `
                  <div style="border:1px solid var(--slate-100); border-radius:var(--radius-md); padding:12px; background:var(--slate-50);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                      <strong style="color:var(--navy-900); font-size:0.85rem;">${escapeHtml(r.referrer_name)}</strong>
                      <span class="badge badge-gold" style="font-size:0.68rem;">${r.conversion_rate}% Conv</span>
                    </div>
                    <div style="font-size:0.75rem; color:var(--slate-500); margin-bottom:6px;">
                      Code: <code>${r.referral_code}</code> • Type: ${escapeHtml(r.referrer_type)}
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--slate-700); border-top:1px dashed var(--slate-200); padding-top:6px;">
                      <span>Referred: <strong>${r.total_referred_merchants}</strong> (${r.converted_merchants} Converted)</span>
                      <span>Commissions: <strong style="color:var(--emerald-600);">₱${(r.commission_earned || 0).toLocaleString()}</strong></span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Regional & Category Distribution -->
            <div class="vp-card" style="padding:22px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy-900); margin:0;">Philippine Regional Hub Growth</h3>
                <span class="badge badge-navy" style="font-size:0.7rem;">5 ECONOMIC ZONES</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${regionalDist.map(rg => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-radius:var(--radius-md); background:var(--slate-50); border:1px solid var(--slate-100);">
                    <div>
                      <div style="font-weight:700; font-size:0.82rem; color:var(--navy-900);">${escapeHtml(rg.region)}</div>
                      <div style="font-size:0.72rem; color:var(--slate-500);">${rg.count} Verified Merchants (${rg.percentage}%)</div>
                    </div>
                    <span class="badge badge-emerald" style="font-size:0.72rem;">${rg.growth}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      // =========================================================================
      // 3. ADMIN & SUPER ADMIN EXECUTIVE REPORT VIEW
      // =========================================================================
      else {
        const kpis = data.executiveKPIs || {};
        const staff = data.staffPerformance || [];
        const depts = data.departmentalHealth || [];
        const growth = data.monthlyGrowthTrajectory || [];
        const auditPreview = data.auditLogsPreview || [];
        const pipelinePreview = data.pipelinePreview || [];

        viewContentHtml = `
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #020617 0%, #1E293B 100%); color:var(--white); border-radius:var(--radius-xl); padding:32px; margin-bottom:24px; border:1px solid rgba(255,255,255,0.15); box-shadow:var(--shadow-md);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="badge badge-emerald" style="font-size:0.75rem;">SUPER ADMIN & EXECUTIVE CLEARANCE</span>
                  <span class="badge badge-gold" style="font-size:0.75rem;">ENTERPRISE CROSS-DEPARTMENTAL MATRIX</span>
                </div>
                <h1 style="font-family:var(--font-heading); font-size:2.1rem; font-weight:900; color:var(--white); margin:0 0 6px;">
                  Executive Directorate Operational & Performance Report
                </h1>
                <p style="font-size:0.88rem; color:var(--slate-300); max-width:760px; margin:0; line-height:1.5;">
                  Full enterprise visibility aggregating compliance logs, merchant acquisition pipeline, staff productivity metrics, dispute arbitration resolutions, and platform solvency.
                </p>
              </div>

              <!-- Export Actions Toolbar -->
              <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                <div style="font-size:0.72rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">EXPORT EXECUTIVE MASTER REPORTS</div>
                <div style="display:flex; gap:6px;">
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('staff_performance', 'csv')">
                    👥 Staff Productivity (CSV)
                  </button>
                  <button class="btn btn-outline" style="background:rgba(255,255,255,0.1); color:var(--white); border-color:rgba(255,255,255,0.2); padding:6px 12px; font-size:0.78rem;" onclick="window.app.exportReportFile('escrow', 'xlsx')">
                    💰 Escrow Vault (.xlsx)
                  </button>
                  <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.78rem; font-weight:800;" onclick="window.app.exportReportFile('admin', 'pdf')">
                    📕 Executive Board PDF
                  </button>
                </div>
              </div>
            </div>

            <!-- Executive KPI Metrics Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:14px; margin-top:24px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">TOTAL REGISTERED USERS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--white); margin:2px 0;">${(kpis.total_registered_users || 1342).toLocaleString()}</div>
                <div style="font-size:0.72rem; color:var(--emerald-400);">${kpis.monthly_platform_growth || '+21.4% MoM'}</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">VERIFIED BUSINESSES</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.total_verified_businesses || 86}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">Active Trustmark</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">VERIFIED FREELANCERS</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--blue-400); margin:2px 0;">${kpis.total_verified_freelancers || 48}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">NBI & Portfolio Cleared</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">ESCROW SOLVENCY VAULT</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.total_escrow_funds_protected || '₱3,842,500'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">100% Guaranteed</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">STAFF RESOLUTION EFFICIENCY</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--amber-400); margin:2px 0;">${kpis.staff_resolution_efficiency || '93%'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">${kpis.avg_staff_review_time_mins || '14.2 mins avg'}</div>
              </div>

              <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-md); padding:12px 14px;">
                <div style="font-size:0.7rem; color:var(--slate-300); text-transform:uppercase; font-weight:700;">SYSTEM UPTIME</div>
                <div style="font-size:1.6rem; font-weight:900; color:var(--emerald-400); margin:2px 0;">${kpis.system_uptime || '99.98%'}</div>
                <div style="font-size:0.72rem; color:var(--slate-300);">0 Security Breaches</div>
              </div>
            </div>
          </div>

          <!-- Section 1: Departmental Operational Health & SLAs -->
          <div style="margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Multi-Departmental Health & SLA Performance</h3>
              <span class="badge badge-emerald" style="font-size:0.75rem;">ALL 4 DIVISIONS ACTIVE</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
              ${depts.map(d => `
                <div class="vp-card" style="padding:18px; border-radius:var(--radius-lg); background:var(--white); border:1px solid var(--slate-200);">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                      <strong style="font-size:0.9rem; color:var(--navy-900);">${escapeHtml(d.department)}</strong>
                      <div style="font-size:0.75rem; color:var(--slate-500);">Lead: ${escapeHtml(d.lead)}</div>
                    </div>
                    <span class="badge ${d.status === 'OPTIMAL' || d.status === 'SECURE' ? 'badge-emerald' : 'badge-gold'}" style="font-size:0.68rem;">
                      ● ${d.status}
                    </span>
                  </div>
                  <div style="font-size:0.8rem; font-weight:700; color:var(--emerald-700); margin-bottom:8px;">
                    ${escapeHtml(d.sla_performance)}
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--slate-600); border-top:1px solid var(--slate-100); padding-top:6px;">
                    <span>Active Queue: <strong>${d.active_queue}</strong></span>
                    <span>Resolved Period: <strong>${d.resolved_period}</strong></span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section 2: Staff Performance & Productivity Tracking Table -->
          <div class="vp-card" style="padding:24px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200); margin-bottom:28px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Staff Activity & Performance Tracking (staff_performance_metrics)</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Productivity and accuracy metrics for verification officers, auditors, sales leads, and operations administrators.</p>
              </div>

              <button class="btn btn-emerald" style="padding:6px 14px; font-size:0.78rem;" onclick="window.app.exportReportFile('staff_performance', 'xlsx')">
                📊 Export Performance Matrix (.xlsx)
              </button>
            </div>

            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                <thead>
                  <tr style="background:var(--slate-50); border-bottom:2px solid var(--slate-200);">
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">STAFF OFFICER</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">DEPARTMENT</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ASSIGNED</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">RESOLVED</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">AVG REVIEW SPEED</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">ACCURACY</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">APPROVE vs REJECT</th>
                    <th style="padding:10px 12px; font-weight:800; color:var(--navy-900);">LAST ACTIVE</th>
                  </tr>
                </thead>
                <tbody>
                  ${staff.map(s => `
                    <tr style="border-bottom:1px solid var(--slate-100);">
                      <td style="padding:10px 12px;">
                        <strong style="color:var(--navy-900); font-size:0.85rem;">${escapeHtml(s.staff_name)}</strong>
                        <div style="font-size:0.7rem; color:var(--slate-400);">${escapeHtml(s.role_name)}</div>
                      </td>
                      <td style="padding:10px 12px; font-size:0.75rem; color:var(--slate-600);">${escapeHtml(s.department)}</td>
                      <td style="padding:10px 12px; font-weight:700;">${s.total_tickets_assigned}</td>
                      <td style="padding:10px 12px; font-weight:700; color:var(--emerald-600);">${s.total_tickets_resolved}</td>
                      <td style="padding:10px 12px; font-size:0.75rem;">${s.avg_review_time_mins} mins</td>
                      <td style="padding:10px 12px;">
                        <span class="badge ${s.compliance_accuracy_rate >= 98 ? 'badge-emerald' : 'badge-gold'}" style="font-size:0.68rem;">
                          ${s.compliance_accuracy_rate}%
                        </span>
                      </td>
                      <td style="padding:10px 12px; font-size:0.75rem;">
                        <span style="color:#047857; font-weight:700;">${s.approvals_count} Appr</span> • 
                        <span style="color:#BE123C; font-weight:700;">${s.rejections_count} Rej</span>
                      </td>
                      <td style="padding:10px 12px; font-size:0.72rem; color:var(--slate-500);">${s.last_active_at}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: Platform Growth Trajectory Matrix -->
          <div class="vp-card" style="padding:24px; border-radius:var(--radius-xl); background:var(--white); border:1px solid var(--slate-200);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:800; color:var(--navy-900); margin:0;">Platform Growth Trajectory (Past 6 Months)</h3>
                <p style="font-size:0.8rem; color:var(--slate-500); margin:2px 0 0;">Historical expansion across verified business listings, consumer active users, and platform revenues.</p>
              </div>
              <span class="badge badge-emerald" style="font-size:0.75rem;">+21.4% MoM RECURRING GROWTH</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px;">
              ${growth.map(g => `
                <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-md); padding:12px; text-align:center;">
                  <div style="font-size:0.72rem; font-weight:800; color:var(--slate-500); margin-bottom:4px;">${escapeHtml(g.month)}</div>
                  <div style="font-size:1.25rem; font-weight:900; color:var(--navy-900);">₱${(g.revenue_php || 0).toLocaleString()}</div>
                  <div style="font-size:0.72rem; color:var(--emerald-600); margin-top:2px;">
                    ${g.verified_merchants} Merchants • ${g.active_users} Users
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        ${perspectiveBarHtml}
        ${viewContentHtml}
      `;

    } catch (err) {
      console.error('Failed to load role based reports:', err);
      container.innerHTML = `
        <div style="padding:32px; background:#FFF1F2; border:1px solid #FECDD3; border-radius:var(--radius-lg); text-align:center;">
          <h4 style="color:#BE123C; font-weight:800;">Unable to Load Analytics & Reports</h4>
          <p style="color:var(--slate-600); font-size:0.85rem; margin-top:4px;">${escapeHtml(err.message)}</p>
          <button class="btn btn-outline" style="margin-top:12px;" onclick="window.app.loadRoleBasedReports()">Try Again</button>
        </div>
      `;
    }
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
    openFaqModal,
    switchFaqCategory,
    toggleFaqItem,
    filterFaqItems,
    openAuthModal,
    setAuthModalMode,
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
    selectRoiPlan,
    updateRoiCalculator,
    openCheckoutModal,
    applyCheckoutPromoCode,
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
    switchStaffTab,
    filterStaffCases,
    claimStaffTicket,
    reassignStaffTicket,
    updateCaseWorkflowStatus,
    openStaffInviteModal,
    submitStaffInvite,
    openStaffEditModal,
    submitStaffEdit,
    deleteStaffAccount,
    deleteStaffFromEditModal,
    resetStaffAccountPassword,
    triggerStaffPasswordResetModal,
    refreshLiveAuditLogs,
    approveStaffCase,
    rejectStaffCase,
    requestStaffResubmission,
    dismissFraudAlert,
    quarantineFraudAlert,
    resolveStaffDispute,
    exportStaffAuditLedger,
    openVaultViewerModal,
    closeVaultViewerModal,
    uploadVaultDoc,
    copyTrustBadgeSnippet,
    startChatWithEntity,
    loadRoleBasedReports,
    switchReportsRolePerspective,
    setAuditorFilterAction,
    setAuditorSearchKeyword,
    setAuditorRiskFilter,
    setSalesStageFilter,
    setSalesCityFilter,
    advancePipelineStage,
    exportReportFile
  };

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
