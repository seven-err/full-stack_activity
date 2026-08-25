/* ============================================================
 * products.js — Products page logic
 * Product CRUD, live search, filtering, sorting, pagination.
 * ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  UI.initSidebar();

  const els = {
    // toolbar
    searchInput: document.getElementById('searchInput'),
    categoryFilter: document.getElementById('categoryFilter'),
    statusFilter: document.getElementById('statusFilter'),
    sortBy: document.getElementById('sortBy'),
    resetFilters: document.getElementById('resetFilters'),
    addProductBtn: document.getElementById('addProductBtn'),

    // table area
    tableBody: document.getElementById('productTableBody'),
    emptyState: document.getElementById('emptyState'),
    tableError: document.getElementById('tableError'),
    retryLoad: document.getElementById('retryLoad'),
    tableFooter: document.getElementById('tableFooter'),
    pageInfo: document.getElementById('pageInfo'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    subtitle: document.getElementById('productsSubtitle'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),

    // product modal / form
    productModal: document.getElementById('productModal'),
    productForm: document.getElementById('productForm'),
    productId: document.getElementById('productId'),
    productName: document.getElementById('productName'),
    productSku: document.getElementById('productSku'),
    productCategory: document.getElementById('productCategory'),
    productPrice: document.getElementById('productPrice'),
    productStock: document.getElementById('productStock'),
    productMinStock: document.getElementById('productMinStock'),
    productImage: document.getElementById('productImage'),
    imagePickBtn: document.getElementById('imagePickBtn'),
    fileName: document.getElementById('fileName'),
    imagePreviewGroup: document.getElementById('imagePreviewGroup'),
    imagePreview: document.getElementById('imagePreview'),
    removeImageBtn: document.getElementById('removeImageBtn'),
    submitProductBtn: document.getElementById('submitProductBtn'),
    submitLabel: document.getElementById('submitLabel'),
    modalTitle: document.getElementById('modalTitle'),
    modalSubtitle: document.getElementById('modalSubtitle'),

    // delete modal
    deleteModal: document.getElementById('deleteModal'),
    deleteMessage: document.getElementById('deleteMessage'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete'),
  };

  /* ---------------------------------------------------------
   * Application state
   * ------------------------------------------------------ */
  const state = {
    search: '',
    categoryId: '',
    status: '',
    sortBy: 'created_at',
    sortDir: 'desc',
    page: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
    categories: [],
    pendingImageFile: null,
    editingId: null,
    deletingId: null,
    modalMode: 'create',
  };

  /* ---------------------------------------------------------
   * Init: read URL params, bind events, first render
   * ------------------------------------------------------ */
  function initStateFromUrl() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('search')) {
      state.search = params.get('search');
      els.searchInput.value = state.search;
    }
    if (params.get('category_id')) {
      state.categoryId = params.get('category_id');
      els.categoryFilter.value = state.categoryId;
    }
    if (['in_stock', 'low_stock', 'out_of_stock'].includes(params.get('status'))) {
      state.status = params.get('status');
      els.statusFilter.value = state.status;
    }
    if (params.get('sort_by') && ['name', 'price', 'stock_quantity', 'created_at'].includes(params.get('sort_by'))) {
      state.sortBy = params.get('sort_by');
    }
    if (params.get('sort_dir') === 'asc' || params.get('sort_dir') === 'desc') {
      state.sortDir = params.get('sort_dir');
    }
    syncSortSelect();

    // Deep links: auto-open modals from dashboard shortcuts
    if (params.get('action') === 'new') {
      setTimeout(() => openProductModal(), 250);
    }
    if (params.get('action') === 'edit' && params.get('id')) {
      setTimeout(() => openEditModal(Number(params.get('id'))), 250);
    }
  }

  function syncSortSelect() {
    els.sortBy.value = `${state.sortBy}:${state.sortDir}`;
  }

  function bindEvents() {
    // Live search (debounced)
    els.searchInput.addEventListener('input', UI.debounce((e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadProducts();
    }, 300));

    els.categoryFilter.addEventListener('change', () => {
      state.categoryId = els.categoryFilter.value;
      state.page = 1;
      loadProducts();
    });

    els.statusFilter.addEventListener('change', () => {
      state.status = els.statusFilter.value;
      state.page = 1;
      loadProducts();
    });

    els.sortBy.addEventListener('change', () => {
      const [by, dir] = els.sortBy.value.split(':');
      state.sortBy = by;
      state.sortDir = dir;
      loadProducts();
    });

    els.resetFilters.addEventListener('click', resetFilters);

    els.prevPage.addEventListener('click', () => changePage(state.page - 1));
    els.nextPage.addEventListener('click', () => changePage(state.page + 1));

    els.addProductBtn.addEventListener('click', () => openProductModal());
    els.emptyAddBtn.addEventListener('click', () => openProductModal());

    // Table row actions (event delegation)
    els.tableBody.addEventListener('click', handleRowAction);

    // Modal wiring
    UI.bindModalBehavior(els.productModal);
    UI.bindModalBehavior(els.deleteModal);

    els.productForm.addEventListener('submit', handleProductSubmit);

    // Image picker
    els.imagePickBtn.addEventListener('click', () => els.productImage.click());
    els.productImage.addEventListener('change', handleImageSelected);
    els.removeImageBtn.addEventListener('click', clearImageSelection);

    // Delete dialog
    els.cancelDelete.addEventListener('click', () => UI.closeModal(els.deleteModal));
    els.confirmDelete.addEventListener('click', performDelete);

    els.retryLoad.addEventListener('click', loadProducts);
  }

  /* ---------------------------------------------------------
   * Data loading & rendering
   * ------------------------------------------------------ */
  async function loadCategories() {
    try {
      const res = await getCategories();
      state.categories = res.data;

      // Filter dropdown
      els.categoryFilter.insertAdjacentHTML(
        'beforeend',
        state.categories.map(
          (c) => `<option value="${c.id}">${UI.escapeHtml(c.name)}</option>`
        ).join('')
      );

      // Restore category from URL after options exist
      const urlCategory = new URLSearchParams(window.location.search).get('category_id');
      if (urlCategory && state.categories.some((c) => String(c.id) === urlCategory)) {
        els.categoryFilter.value = urlCategory;
      }

      // Form select
      els.productCategory.insertAdjacentHTML(
        'beforeend',
        state.categories.map(
          (c) => `<option value="${c.id}">${UI.escapeHtml(c.name)}</option>`
        ).join('')
      );
    } catch (error) {
      console.error('[products] failed to load categories:', error);
    }
  }

  async function loadProducts() {
    setTableLoading(true);
    els.emptyState.hidden = true;
    els.tableError.hidden = true;

    try {
      const response = await getProducts({
        search: state.search,
        category_id: state.categoryId,
        status: state.status,
        sort_by: state.sortBy,
        sort_dir: state.sortDir,
        page: state.page,
        per_page: state.perPage,
      });

      const products = response.data;
      state.total = response.meta.total;
      state.lastPage = Math.max(response.meta.last_page, 1);
      state.page = Math.min(response.meta.current_page, state.lastPage);

      renderTable(products);
      updateSubtitle(products.length, state.total);
      renderPagination();

      els.tableFooter.hidden = products.length === 0;
      els.tableBody.hidden = false;

      if (products.length === 0) {
        els.emptyState.hidden = false;
      }
    } catch (error) {
      console.error('[products] failed to load:', error);
      els.tableBody.innerHTML = '';
      els.tableFooter.hidden = true;
      els.emptyState.hidden = true;
      els.tableError.hidden = false;
    } finally {
      setTableLoading(false);
    }
  }

  function setTableLoading(isLoading) {
    if (isLoading) showSkeletonRows();
  }

  /** Show shimmer rows instead of data while a request is in flight */
  function showSkeletonRows() {
    const cols = 7;
    els.tableBody.innerHTML = Array.from({ length: Math.min(state.perPage, 8) })
      .map(() => `
        <tr class="skeleton-row">
          <td><div style="display:flex;align-items:center;gap:12px">
            <span class="sk-thumb sk-card"></span><span class="sk-line sk-card" style="width:150px"></span>
          </div></td>
          ${'<td></td>'.repeat(cols - 3)}
          <td><span class="sk-line sk-card" style="width:60px;display:block"></span></td>
          <td class="td-right"><span class="sk-line sk-card" style="width:70px;display:inline-block"></span></td>
          <td class="td-right"><span class="sk-line sk-card" style="width:40px;display:inline-block"></span></td>
          <td><span class="sk-line sk-card" style="width:80px;display:block"></span></td>
          <td class="td-right"><span class="sk-line sk-card" style="width:90px;display:inline-block"></span></td>
        </tr>`)
      .join('');
  }

  function renderTable(products) {
    els.tableBody.innerHTML = products
      .map((p) => `
        <tr data-id="${p.id}">
          <td>
            <div class="cell-product">
              ${renderThumb(p.image)}
              <div>
                <p class="prod-name" title="${UI.escapeHtml(p.name)}">${UI.escapeHtml(p.name)}</p>
                <p class="prod-sku">${UI.escapeHtml(p.sku)}</p>
              </div>
            </div>
          </td>
          <td>${UI.escapeHtml(p.sku)}</td>
          <td><span class="cell-category" title="${UI.escapeHtml(p.category_name || '')}">${UI.escapeHtml(p.category_name || '—')}</span></td>
          <td class="td-right"><span class="cell-price">${UI.formatCurrency(p.price)}</span></td>
          <td class="td-right">
            <span class="stock-num ${stockClass(p)}">${p.stock_quantity}</span>
            <small style="color:var(--text-3)">/ min ${p.minimum_stock}</small>
          </td>
          <td>${UI.statusBadge(p.status)}</td>
          <td class="td-right">
            <div class="row-actions">
              <button class="action-btn view" data-action="view" title="View details">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.06 12.35a1 1 0 0 1 0-.7c.74-1.9 3.6-6.15 9.94-6.15s9.2 4.25 9.94 6.15a1 1 0 0 1 0 .7c-.74 1.9-3.6 6.15-9.94 6.15s-9.2-4.25-9.94-6.15Z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="action-btn edit" data-action="edit" title="Edit product">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 4 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button class="action-btn delete" data-action="delete" title="Delete product">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`)
      .join('');
  }

  function renderThumb(imageUrl) {
    const fallback = `<span class="prod-thumb prod-thumb-fallback">${UI.icons.box}</span>`;

    if (!imageUrl) return fallback;

    // Image sits on top of the fallback; if it fails to load it is
    // removed, revealing the placeholder underneath.
    return `
      <div class="prod-thumb prod-thumb-fallback">
        ${UI.icons.box}
        <img src="${UI.escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.remove()">
      </div>`;
  }

  function stockClass(product) {
    if (Number(product.stock_quantity) === 0) return 'stock-out';
    if (Number(product.stock_quantity) <= Number(product.minimum_stock)) return 'stock-low';
    return '';
  }

  function updateSubtitle(shownCount, totalCount) {
    const hasFilters = state.search || state.categoryId || state.status;
    els.subtitle.textContent = hasFilters
      ? `${totalCount} result${totalCount === 1 ? '' : 's'} found`
      : `${totalCount} product${totalCount === 1 ? '' : 's'} in inventory`;
  }

  /* ---------------- Pagination ---------------- */

  function renderPagination() {
    els.pageInfo.innerHTML =
      `Page <strong>${state.page}</strong> of <strong>${state.lastPage}</strong> · ` +
      `<strong>${state.total}</strong> product${state.total === 1 ? '' : 's'}`;
    els.prevPage.disabled = state.page <= 1;
    els.nextPage.disabled = state.page >= state.lastPage;
  }

  function changePage(page) {
    if (page < 1 || page > state.lastPage || page === state.page) return;
    state.page = page;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- Row action routing ---------------- */

  function handleRowAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const row = button.closest('tr');
    const id = Number(row?.dataset.id);
    if (!id) return;

    switch (button.dataset.action) {
      case 'view':
        openViewModal(id);
        break;
      case 'edit':
        openEditModal(id);
        break;
      case 'delete':
        openDeleteModal(id, row.querySelector('.prod-name')?.textContent || 'This product');
        break;
    }
  }

  /* =========================================================
   * VIEW modal (read-only details)
   * ====================================================== */
  function openViewModal(id) {
    getProduct(id)
      .then(({ data: p }) => buildFormModal({ mode: 'view', product: p }))
      .catch((err) => handleError(err));
  }

  /* =========================================================
   * CREATE / EDIT modal
   * ====================================================== */
  function buildFormModal({ mode, product = null }) {
    clearFieldErrors();
    state.pendingImageFile = null;
    state.modalMode = mode;
    state.editingId = product ? product.id : null;

    els.modalTitle.textContent = mode === 'view'
      ? 'Product Details'
      : (mode === 'edit' ? 'Edit Product' : 'Add Product');

    els.modalSubtitle.textContent = mode === 'view'
      ? 'Read-only overview of this inventory item.'
      : (mode === 'edit'
        ? `Update the details of “${product.name}”.`
        : 'Fill in the details below to create a new product.');

    els.submitLabel.textContent = mode === 'view' ? 'Close'
      : (mode === 'edit' ? 'Save Changes' : 'Create Product');

    // Populate fields
    els.productId.value = product ? product.id : '';
    els.productName.value = product ? product.name : '';
    els.productSku.value = product ? product.sku : '';
    els.productCategory.value = product ? String(product.category_id) : '';
    els.productPrice.value = product ? product.price : '';
    els.productStock.value = product ? product.stock_quantity : '';
    els.productMinStock.value = product ? product.minimum_stock : '';

    // Lock fields when viewing
    const readOnly = mode === 'view';
    [els.productName, els.productSku, els.productCategory,
      els.productPrice, els.productStock, els.productMinStock].forEach((el) => {
      el.readOnly = readOnly;
      el.disabled = readOnly;
    });
    els.imagePickBtn.hidden = readOnly;
    els.removeImageBtn.hidden = true;

    // Existing image preview
    if (product && product.image) {
      els.imagePreview.src = product.image;
      els.imagePreviewGroup.hidden = false;
      els.fileName.textContent = 'Current image — choose a file to replace it.';
    } else {
      els.imagePreview.removeAttribute('src');
      els.imagePreviewGroup.hidden = true;
      els.fileName.innerHTML = 'JPG, PNG, GIF or WebP — max 2&nbsp;MB';
    }

    UI.showModal(els.productModal);
  }

  function openProductModal() {
    buildFormModal({ mode: 'create' });
  }

  async function openEditModal(id) {
    try {
      const res = await getProduct(id);
      buildFormModal({ mode: 'edit', product: res.data });
    } catch (error) {
      handleError(error);
    }
  }

  /* ---------------- Image selection ---------------- */

  function handleImageSelected(event) {
    const input = event.target;
    const file = input.files && input.files[0];

    clearFieldError('image');

    if (!file) return;

    // Client-side validation mirroring Laravel rules
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFieldError('image', 'Only JPG, PNG, GIF or WebP files are allowed.');
      input.value = '';
      return;
    }
    if (file.size > 2048 * 1024) {
      setFieldError('image', 'Image must not exceed 2 MB.');
      input.value = '';
      return;
    }

    state.pendingImageFile = file;
    els.fileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      els.imagePreview.src = e.target.result;
      els.imagePreviewGroup.hidden = false;
      els.removeImageBtn.hidden = false;
    };
    reader.readAsDataURL(file);
  }

  function clearImageSelection() {
    els.productImage.value = '';
    state.pendingImageFile = null;
    els.imagePreviewGroup.hidden = true;
    els.imagePreview.removeAttribute('src');
    els.fileName.innerHTML = 'JPG, PNG, GIF or WebP — max 2&nbsp;MB';
  }

  /* =========================================================
   * Submit (create or update)
   * ====================================================== */
  async function handleProductSubmit(event) {
    event.preventDefault();

    // Read-only "details" modal — the primary button simply closes it
    if (state.modalMode === 'view') {
      UI.closeModal(els.productModal);
      return;
    }

    const isEdit = state.modalMode === 'edit';

    clearFieldErrors();

    const values = {
      name: els.productName.value.trim(),
      sku: els.productSku.value.trim(),
      category_id: els.productCategory.value,
      price: els.productPrice.value,
      stock_quantity: els.productStock.value,
      minimum_stock: els.productMinStock.value,
    };

    // ---- Frontend validation (backend re-validates everything) ----
    let valid = true;

    if (values.name.length < 2) {
      setFieldError('name', 'Product name must be at least 2 characters.');
      valid = false;
    } else if (values.name.length > 150) {
      setFieldError('name', 'Product name must not exceed 150 characters.');
      valid = false;
    }

    if (values.sku && values.sku.length > 50) {
      setFieldError('sku', 'SKU must not exceed 50 characters.');
      valid = false;
    }

    if (!values.category_id) {
      setFieldError('category_id', 'Please select a category.');
      valid = false;
    }

    if (values.price === '' || Number.isNaN(Number(values.price)) || Number(values.price) < 0) {
      setFieldError('price', 'Enter a valid price of 0 or more.');
      valid = false;
    } else if (Number(values.price) > 99999999.99) {
      setFieldError('price', 'Price exceeds the maximum allowed value.');
      valid = false;
    }

    if (values.stock_quantity === '' || Number.isNaN(Number(values.stock_quantity)) ||
        Number(values.stock_quantity) < 0 || !Number.isInteger(Number(values.stock_quantity))) {
      setFieldError('stock_quantity', 'Enter a whole number of 0 or more.');
      valid = false;
    }

    if (values.minimum_stock === '' || Number.isNaN(Number(values.minimum_stock)) ||
        Number(values.minimum_stock) < 0 || !Number.isInteger(Number(values.minimum_stock))) {
      setFieldError('minimum_stock', 'Enter a whole number of 0 or more.');
      valid = false;
    }

    if (!valid) {
      UI.showToast('warning', 'Check the form', 'Please fix the highlighted fields and try again.');
      return;
    }

    // ---- Build multipart payload ----
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('sku', values.sku);
    formData.append('category_id', values.category_id);
    formData.append('price', values.price);
    formData.append('stock_quantity', values.stock_quantity);
    formData.append('minimum_stock', values.minimum_stock);

    if (state.pendingImageFile) {
      formData.append('image', state.pendingImageFile);
    }

    setSubmitting(true);

    try {
      if (isEdit) {
        formData.append('_method', 'PUT');
        await updateProduct(state.editingId, formData);
        UI.showToast('success', 'Product updated', `“${values.name}” was saved successfully.`);
      } else {
        await createProduct(formData);
        UI.showToast('success', 'Product added', `“${values.name}” was added to your inventory.`);
      }

      UI.closeModal(els.productModal);
      state.page = 1; // newest items appear first
      loadProducts();
      UI.renderSidebarCategories(); // refresh sidebar counts
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        applyServerErrors(error.errors);
        UI.showToast('error', 'Validation failed', error.message);
      } else {
        handleError(error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function setSubmitting(isSubmitting) {
    els.submitProductBtn.disabled = isSubmitting;
    els.submitProductBtn.querySelector('.spinner').hidden = !isSubmitting;
    els.submitLabel.style.opacity = isSubmitting ? '.7' : '';
  }

  /* =========================================================
   * DELETE flow
   * ====================================================== */
  function openDeleteModal(id, productName) {
    state.deletingId = id;
    els.deleteMessage.innerHTML =
      `Are you sure you want to permanently remove<br>` +
      `<strong>“${UI.escapeHtml(productName)}”</strong> from your inventory?`;
    UI.showModal(els.deleteModal);
  }

  async function performDelete() {
    if (!state.deletingId) return;

    const spinner = els.confirmDelete.querySelector('.spinner');
    els.confirmDelete.disabled = true;
    spinner.hidden = false;

    try {
      await deleteProduct(state.deletingId);

      UI.closeModal(els.deleteModal);
      UI.showToast('success', 'Product deleted', 'The product was permanently removed.');

      // If we deleted the only item on the last page, step back one page
      const remainingOnPage = els.tableBody.querySelectorAll('tr[data-id]').length;
      if (remainingOnPage <= 1 && state.page > 1) {
        state.page -= 1;
      }

      loadProducts();
      UI.renderSidebarCategories();
    } catch (error) {
      handleError(error);
      UI.closeModal(els.deleteModal);
    } finally {
      els.confirmDelete.disabled = false;
      spinner.hidden = true;
      state.deletingId = null;
    }
  }

  /* ---------------- Filters reset ---------------- */

  function resetFilters() {
    state.search = '';
    state.categoryId = '';
    state.status = '';
    state.sortBy = 'created_at';
    state.sortDir = 'desc';
    state.page = 1;

    els.searchInput.value = '';
    els.categoryFilter.value = '';
    els.statusFilter.value = '';
    syncSortSelect();

    loadProducts();
  }

  /* =========================================================
   * Validation helpers (field-level errors)
   * ====================================================== */
  function fieldErrorEl(field) {
    return els.productForm.querySelector(`[data-error-for="${field}"]`);
  }

  function setFieldError(field, message) {
    const el = fieldErrorEl(field);
    if (el) el.textContent = message;

    const inputs = { name: els.productName, sku: els.productSku, category_id: els.productCategory,
      price: els.productPrice, stock_quantity: els.productStock,
      minimum_stock: els.productMinStock };
    inputs[field]?.classList.add('invalid');
  }

  function clearFieldError(field) {
    const el = fieldErrorEl(field);
    if (el) el.textContent = '';

    const inputs = { name: els.productName, sku: els.productSku, category_id: els.productCategory,
      price: els.productPrice, stock_quantity: els.productStock,
      minimum_stock: els.productMinStock };
    inputs[field]?.classList.remove('invalid');
  }

  function clearFieldErrors() {
    ['name', 'sku', 'category_id', 'price', 'stock_quantity', 'minimum_stock', 'image']
      .forEach(clearFieldError);
  }

  /** Maps Laravel 422 error bag onto form fields */
  function applyServerErrors(errors) {
    Object.entries(errors).forEach(([field, messages]) => {
      setFieldError(field, Array.isArray(messages) ? messages[0] : String(messages));
    });
  }

  /** Generic API/network error handling */
  function handleError(error) {
    console.error('[products]', error);

    if (error instanceof ApiError) {
      if (error.status === 404) {
        UI.showToast('error', 'Not found', 'The requested product no longer exists.');
      } else if (error.status === 0) {
        UI.showToast('error', 'Connection failed', 'Unable to reach the server. Please try again.');
      } else {
        UI.showToast('error', 'Request failed', error.message);
      }
    } else {
      UI.showToast('error', 'Unexpected error', 'Something went wrong. Please try again.');
    }
  }

  /* ---------------------------------------------------------
   * Boot
   * ------------------------------------------------------ */
  initStateFromUrl();
  bindEvents();
  loadCategories().then(loadProducts);
});
