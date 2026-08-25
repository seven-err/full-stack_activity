/* ============================================================
 * dashboard.js — Dashboard page logic
 * Fetches /api/dashboard and renders stats, charts, lists.
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  UI.initSidebar();

  const els = {
    statsGrid: document.getElementById('statsGrid'),
    donutWrap: document.getElementById('statusDonutWrap'),
    categoryBars: document.getElementById('categoryBars'),
    recentList: document.getElementById('recentList'),
    lowStockList: document.getElementById('lowStockList'),
    errorBox: document.getElementById('dashError'),
    retryBtn: document.getElementById('retryDashboard'),
  };

  const DONUT_COLORS = {
    'In Stock': { cssVar: '--c-success', hex: '#16a34a' },
    'Low Stock': { cssVar: '--c-warning', hex: '#d97706' },
    'Out of Stock': { cssVar: '--c-danger', hex: '#dc2626' },
  };

  async function loadDashboard() {
    // Reset to skeleton state
    els.errorBox.hidden = true;
    renderStatSkeletons();
    renderChartSkeletons();

    try {
      const response = await getDashboardStats();
      const stats = response.data;

      renderStats(stats);
      renderStatusDonut(stats.stock_status_distribution, stats.total_products);
      renderCategoryBars(stats.products_by_category);
      renderRecentProducts(stats.recent_products);
      renderLowStockAlerts(stats.low_stock_products);
    } catch (error) {
      console.error('[dashboard] failed to load:', error);
      els.statsGrid.hidden = true;
      els.errorBox.hidden = false;
    }
  }

  /* ---------------- Stat cards ---------------- */

  function statCardConfig(stats) {
    return [
      {
        label: 'Total Products',
        value: UI.formatCompact(stats.total_products),
        foot: `${stats.total_products} product${stats.total_products === 1 ? '' : 's'} tracked`,
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
        tone: 'ic-neutral',
        href: 'products.html',
      },
      {
        label: 'Total Stock Units',
        value: UI.formatCompact(stats.total_stock),
        foot: `${UI.formatCompact(stats.in_stock_items)} items fully stocked`,
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        tone: 'ic-dark',
        href: 'products.html?sort_by=stock_quantity&sort_dir=desc',
      },
      {
        label: 'Inventory Value',
        value: UI.formatCurrency(stats.total_inventory_value),
        foot: 'Price × stock, all products',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
        tone: 'ic-neutral',
        href: 'products.html?sort_by=price&sort_dir=desc',
      },
      {
        label: 'Low Stock Items',
        value: String(stats.low_stock_items),
        foot: stats.low_stock_items > 0 ? 'At or below minimum level' : 'Everything is healthy',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        tone: 'ic-warning',
        href: 'products.html?status=low_stock',
      },
      {
        label: 'Out of Stock',
        value: String(stats.out_of_stock_items),
        foot: stats.out_of_stock_items > 0 ? 'Needs restocking urgently' : 'No gaps in availability',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
        tone: 'ic-danger',
        href: 'products.html?status=out_of_stock',
      },
    ];
  }

  function renderStats(stats) {
    els.statsGrid.hidden = false;
    els.statsGrid.innerHTML = statCardConfig(stats)
      .map((card) => `
        <a class="stat-card" href="${card.href}" aria-label="${card.label}: ${card.value}">
          <div class="stat-top">
            <span class="stat-label">${card.label}</span>
            <span class="stat-icon ${card.tone}">${card.icon}</span>
          </div>
          <p class="stat-value">${card.value}</p>
          <p class="stat-foot">${card.foot}</p>
        </a>
      `)
      .join('');
  }

  /* ---------------- Donut chart (conic-gradient) ---------------- */

  function renderStatusDonut(distribution, total) {
    if (!total) {
      els.donutWrap.innerHTML = `
        <div class="donut-empty">
          <div class="empty-icon">${UI.icons.box}</div>
          <p>No stock data yet</p>
          <small>Add products to see the distribution.</small>
        </div>`;
      return;
    }

    // Compute cumulative percentage ranges for each status slice
    let acc = 0;
    const segments = distribution.map((seg) => {
      const pct = total > 0 ? (seg.value / total) * 100 : 0;
      const range = { ...seg, start: acc, end: acc + pct };
      acc += pct;
      return range;
    });

    const stops = segments
      .filter((s) => s.end > s.start)
      .map((s) => `${DONUT_COLORS[s.label].hex} ${s.start.toFixed(2)}% ${s.end.toFixed(2)}%`);

    const legend = segments
      .filter((s) => s.value > 0)
      .map((s) => `
        <li class="legend-item">
          <span class="legend-dot" style="background:${DONUT_COLORS[s.label].hex}"></span>
          <div class="legend-meta">
            <span>${s.label}</span>
            <span class="legend-value">${s.value}</span>
            <span class="legend-pct">${(s.end - s.start).toFixed(0)}%</span>
          </div>
        </li>`)
      .join('');

    els.donutWrap.innerHTML = `
      <div class="donut" style="background:conic-gradient(${stops.join(', ')})">
        <div class="donut-center">
          <span class="donut-total">${total}</span>
          <span class="donut-caption">Products</span>
        </div>
      </div>
      <ul class="donut-legend">${legend}</ul>
    `;
  }

  /* ---------------- Category bars ---------------- */

  function renderCategoryBars(categories) {
    const max = Math.max(...categories.map((c) => c.value), 1);

    els.categoryBars.innerHTML = categories
      .map((cat) => `
        <div class="cat-row">
          <span class="cat-name" title="${UI.escapeHtml(cat.name)}">${UI.escapeHtml(cat.name)}</span>
          <div class="bar-track">
            <div class="bar-fill" data-width="${((cat.value / max) * 100).toFixed(1)}"></div>
          </div>
          <span class="cat-count"><strong>${cat.value}</strong> · ${cat.total_units} units</span>
        </div>`)
      .join('');

    requestAnimationFrame(() => {
      els.categoryBars.querySelectorAll('.bar-fill').forEach((bar) => {
        bar.style.width = `${bar.dataset.width}%`;
      });
    });
  }

  /* ---------------- Recent products list ---------------- */

  function renderRecentProducts(products) {
    if (!products.length) {
      els.recentList.innerHTML =
        '<li class="item-row"><p class="item-sub">No products yet — add your first one.</p></li>';
      return;
    }

    els.recentList.innerHTML = products
      .map((p) => `
        <li class="item-row">
          <div class="item-info">
            <p class="item-title">${UI.escapeHtml(p.name)}</p>
            <p class="item-sub">${UI.escapeHtml(p.sku)} · ${UI.escapeHtml(p.category_name || 'Uncategorized')}</p>
          </div>
          <div class="item-end">
            <span class="item-price">${UI.formatCurrency(p.price)}</span>
            ${UI.statusBadge(p.status)}
          </div>
        </li>`)
      .join('');
  }

  /* ---------------- Low stock alerts ---------------- */

  function renderLowStockAlerts(products) {
    if (!products.length) {
      els.lowStockList.innerHTML =
        '<li class="item-row"><p class="item-sub">All products are above their minimum level. 🎉</p></li>';
      return;
    }

    els.lowStockList.innerHTML = products
      .map((p) => {
        const critical = Number(p.stock_quantity) === 0;
        return `
          <li class="item-row">
            <div class="item-info">
              <p class="item-title">${UI.escapeHtml(p.name)}</p>
              <p class="item-sub">Min. ${p.minimum_stock} units · ${UI.escapeHtml(p.category_name || '')}</p>
            </div>
            <div class="item-end">
              <span class="stock-pill ${critical ? 'critical' : 'warn'}">
                ${critical ? 'Out' : `${p.stock_quantity} left`}
              </span>
              <a class="action-btn edit" href="products.html?action=edit&id=${p.id}" title="Restock / edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 4 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </a>
            </div>
          </li>`;
      })
      .join('');
  }

  /* ---------------- Skeletons & wiring ---------------- */

  function renderStatSkeletons() {
    els.statsGrid.hidden = false;
    els.statsGrid.innerHTML =
      '<div class="stat-card sk-card"></div>'.repeat(5);
  }

  function renderChartSkeletons() {
    els.donutWrap.innerHTML = '<div class="donut-loading sk-card"></div>';
    els.categoryBars.innerHTML =
      '<div class="sk-bar sk-card"></div>'.repeat(4);
    els.recentList.innerHTML = '<li class="sk-list-item sk-card"></li>'.repeat(3);
    els.lowStockList.innerHTML = '<li class="sk-list-item sk-card"></li>'.repeat(3);
  }

  els.retryBtn.addEventListener('click', loadDashboard);

  loadDashboard();
});
