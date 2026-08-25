/* ============================================================
 * ui.js — Shared UI helpers
 * Toast notifications, modal control, formatting, DOM utilities.
 * ============================================================ */

const UI = (() => {

  /* ---------------------------------------------------------
   * SVG icon snippets (Lucide-style paths)
   * ------------------------------------------------------ */
  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.8 10A10 10 0 1 1 17 3.34"/><path d="m9 11 3 3L22 4"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  };

  /* ---------------------------------------------------------
   * Toast notifications
   * ------------------------------------------------------ */
  function getToastContainer() {
    let container = document.querySelector('.toast-container');

    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'status');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    return container;
  }

  /**
   * Show a toast notification.
   * @param {string} type    success | error | warning | info
   * @param {string} title   bold headline
   * @param {string} message supporting detail (optional)
   * @param {number} timeout auto-dismiss ms (default 3800)
   */
  function showToast(type = 'info', title = '', message = '', timeout = 3800) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
      ${ICONS[type] || ICONS.info}
      <div class="toast-content">
        <p class="toast-title"></p>
        <p class="toast-message"></p>
      </div>
      <button class="toast-close" aria-label="Dismiss notification">${ICONS.close}</button>
    `;

    toast.querySelector('.toast-title').textContent = title;
    const msgEl = toast.querySelector('.toast-message');
    if (message) {
      msgEl.textContent = message;
    } else {
      msgEl.remove();
    }

    const dismiss = () => {
      if (!toast.isConnected) return;
      toast.classList.add('leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);

    if (timeout > 0) setTimeout(dismiss, timeout);
  }

  /* ---------------------------------------------------------
   * Modals
   * ------------------------------------------------------ */
  function showModal(overlayEl) {
    overlayEl.hidden = false;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside for keyboard users
    const firstField = overlayEl.querySelector('input:not([type=hidden]), select, button');
    if (firstField) setTimeout(() => firstField.focus(), 60);
  }

  function closeModal(overlayEl) {
    overlayEl.hidden = true;

    // Only release scroll-lock when no other modal is open
    const anyOpen = document.querySelectorAll('.modal-overlay:not([hidden])');
    if (anyOpen.length === 0) document.body.style.overflow = '';
  }

  /** Wire every [data-close-modal] trigger */
  function bindModalBehavior(overlayEl) {
    overlayEl.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(overlayEl));
    });
    // NOTE: intentional — no backdrop-click / Escape closing.
    // Modals may only be dismissed via their explicit Close/Cancel buttons
    // so users never lose form input by accident.
  }

  /* ---------------------------------------------------------
   * Formatting helpers
   * ------------------------------------------------------ */

  /** $1,234.56 — currency formatter (USD default) */
  function formatCurrency(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(number);
  }

  /** Aug 25, 2026 */
  function formatDate(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Compact numbers: 12500 → 12.5K */
  function formatCompact(value) {
    const n = Number(value) || 0;
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
    return String(n);
  }

  /** Escapes HTML to prevent XSS when injecting API data into innerHTML */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Debounce helper for live search */
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /** Status metadata used by both pages */
  const STATUS_META = {
    in_stock:     { label: 'In Stock',     badgeClass: 'badge-in_stock' },
    low_stock:    { label: 'Low Stock',    badgeClass: 'badge-low_stock' },
    out_of_stock: { label: 'Out of Stock', badgeClass: 'badge-out_of_stock' },
  };

  function statusBadge(status) {
    const meta = STATUS_META[status] || STATUS_META.in_stock;
    return `<span class="badge ${meta.badgeClass}">${meta.label}</span>`;
  }

  /**
   * Shared sidebar behaviour: hamburger toggle + dynamic categories.
   * Called by each page's script.
   */
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const toggle = document.getElementById('menuToggle');

    if (!sidebar || !backdrop || !toggle) return;

    const setOpen = (open) => {
      sidebar.classList.toggle('open', open);
      backdrop.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
    backdrop.addEventListener('click', () => setOpen(false));

    renderSidebarCategories();
  }

  async function renderSidebarCategories() {
    const wrap = document.getElementById('navCategories');
    if (!wrap) return;

    try {
      const res = await getCategories();
      wrap.innerHTML = res.data
        .map((cat) => `
          <a class="nav-subitem" href="products.html?category_id=${cat.id}" title="${UI.escapeHtml(cat.name)}">
            <span>${UI.escapeHtml(cat.name)}</span>
            <span class="nav-count">${cat.products_count}</span>
          </a>
        `)
        .join('');
    } catch (_) {
      wrap.innerHTML =
        '<a class="nav-subitem" href="products.html"><span>All categories</span></a>';
    }
  }

  /* Public API */
  return {
    showToast,
    showModal,
    closeModal,
    bindModalBehavior,
    formatCurrency,
    formatDate,
    formatCompact,
    escapeHtml,
    debounce,
    statusBadge,
    STATUS_META,
    initSidebar,
    renderSidebarCategories,
    icons: { box: ICONS.box },
  };
})();
