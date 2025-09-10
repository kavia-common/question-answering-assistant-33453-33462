//
// Frontend API client for Q&A endpoints
//
// Uses REACT_APP_BACKEND_URL if provided; otherwise falls back to a detected backend URL.
// For local development the default fallback is http://localhost:3001.
//
// PUBLIC_INTERFACE
export function getBackendBaseUrl() {
  /**
   * This function resolves the backend base URL.
   * Precedence:
   * 1) process.env.REACT_APP_BACKEND_URL
   * 2) If running under a preview/proxy path, try to use the same origin with /api prefix
   * 3) Fallback to http://localhost:3001
   */
  const envUrl = process?.env?.REACT_APP_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, ''); // trim trailing slash
  }

  try {
    // If the frontend is served via the same origin with a dev proxy, we can try relative /api.
    // This covers setups where the backend is reverse-proxied under the same host.
    const { origin } = window.location;
    if (origin) {
      // Not adding /api here; endpoints below include /api path segments already.
      return origin.replace(/\/+$/, '');
    }
  } catch (e) {
    // ignore and continue to fallback
  }

  // Default fallback for local development
  return 'http://localhost:3001';
}

/**
 * Helper to build a RequestInit with JSON headers and body where applicable.
 */
function buildRequestInit(method = 'GET', data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const init = { method, headers };
  if (data !== undefined) {
    init.body = JSON.stringify(data);
  }
  return init;
}

/**
 * Internal helper to perform fetch with robust error handling.
 */
async function doFetch(path, init) {
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  let resp;
  try {
    resp = await fetch(url, init);
  } catch (networkErr) {
    // Provide a consistent error shape
    const err = new Error('Network error while contacting backend');
    err.cause = networkErr;
    err.url = url;
    throw err;
  }

  // Attempt to parse JSON; if not JSON, still raise for non-2xx.
  const contentType = resp.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!resp.ok) {
    let detail = undefined;
    if (isJson) {
      try {
        const body = await resp.json();
        detail = body?.detail || body?.message || body;
      } catch (_) {
        // ignore parse error
      }
    } else {
      try {
        detail = await resp.text();
      } catch (_) {
        // ignore parse error
      }
    }
    const err = new Error(`Backend error: ${resp.status} ${resp.statusText}`);
    err.status = resp.status;
    err.url = url;
    err.detail = detail;
    throw err;
  }

  if (isJson) {
    return resp.json();
  }

  // If backend returned non-JSON success, return raw text as fallback.
  return resp.text();
}

// PUBLIC_INTERFACE
export async function askQuestion(question) {
  /**
   * Submit a question to the backend Q&A service.
   *
   * Parameters:
   *  - question: string (required) The user question to be answered.
   *
   * Returns:
   *  - Promise resolving to the created QARecord (JSON object).
   *
   * Throws:
   *  - Error with details if the request fails or the backend returns a non-2xx response.
   */
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    const err = new Error('Invalid input: question must be a non-empty string.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const payload = { question: question.trim() };
  return doFetch('/api/qa/ask', buildRequestInit('POST', payload));
}

// PUBLIC_INTERFACE
export async function getHistory() {
  /**
   * Retrieve the Q&A history from the backend.
   *
   * Parameters:
   *  - none
   *
   * Returns:
   *  - Promise resolving to an array of QARecord objects.
   *
   * Throws:
   *  - Error with details if the request fails or the backend returns a non-2xx response.
   */
  return doFetch('/api/qa/history', buildRequestInit('GET'));
}
