/* ============================================================
 * api.js — Central API communication layer
 * All Fetch API calls to the Laravel backend live here.
 * ============================================================ */

const API_CONFIG = {
  // Base URL of the Laravel REST API
  baseURL: 'http://localhost:8000/api',
};

class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors || null; // Laravel validation error bag (422)
  }
}

/**
 * Low-level request wrapper around the Fetch API.
 *
 * @param {string} endpoint   e.g. '/products'
 * @param {object} options    { method, body, isForm }
 * @returns {Promise<object>} parsed JSON response
 */
async function apiRequest(endpoint, { method = 'GET', body = null, isForm = false } = {}) {
  const options = {
    method,
    headers: {},
  };

  if (body) {
    if (isForm) {
      // Let the browser set multipart/form-data + boundary automatically
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  let response;

  try {
    response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, options);
  } catch (networkError) {
    // DNS failure / server offline / CORS block etc.
    throw new ApiError('Unable to reach the server. Is the API running?', 0);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    // Non-JSON body — fall through with null payload
  }

  if (!response.ok) {
    const message =
      (payload && payload.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload ? payload.errors : null);
  }

  return payload;
}

/* ---------- Products ---------- */

/**
 * GET /api/products
 * @param {object} params { search, category_id, status, sort_by, sort_dir, page, per_page }
 */
function getProducts(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      query.append(key, value);
    }
  });

  const qs = query.toString();
  return apiRequest(`/products${qs ? `?${qs}` : ''}`);
}

/** GET /api/products/{id} */
function getProduct(id) {
  return apiRequest(`/products/${id}`);
}

/**
 * POST /api/products — accepts a FormData object (supports image upload).
 * @returns {Promise<object>} created product payload
 */
function createProduct(formData) {
  return apiRequest('/products', { method: 'POST', body: formData, isForm: true });
}

/**
 * PUT /api/products/{id} — sent as POST with _method=PUT so file uploads work.
 * @returns {Promise<object>} updated product payload
 */
function updateProduct(id, formData) {
  return apiRequest(`/products/${id}`, { method: 'POST', body: formData, isForm: true });
}

/** DELETE /api/products/{id} */
function deleteProduct(id) {
  return apiRequest(`/products/${id}`, { method: 'DELETE' });
}

/* ---------- Categories ---------- */

/** GET /api/categories */
function getCategories() {
  return apiRequest('/categories');
}

/* ---------- Dashboard ---------- */

/** GET /api/dashboard */
function getDashboardStats() {
  return apiRequest('/dashboard');
}
