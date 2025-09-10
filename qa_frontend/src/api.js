//
//
// Frontend API client for Q&A endpoints
//
// Uses REACT_APP_BACKEND_URL if provided; otherwise falls back to a detected backend URL.
// For local development the default fallback is http://localhost:3001.
//
/**
 * PUBLIC_INTERFACE
 */
export function getBackendBaseUrl() {
  /**
   * This function resolves the backend base URL.
   * Precedence:
   * 1) process.env.REACT_APP_BACKEND_URL
   * 2) If running in the browser:
   *    - If current port is 3000 (CRA dev/preview), assume backend on same host at port 3001.
   *    - Otherwise, use window.location.origin with port preserved.
   * 3) Fallback to http://localhost:3001
   *
   * Note: Endpoints include '/api' path segments already.
   *
   * This function must NEVER throw. It should always return a string.
   */
  let resolved = 'http://localhost:3001';
  try {
    const envUrl =
      (typeof process !== 'undefined' &&
        process &&
        process.env &&
        process.env.REACT_APP_BACKEND_URL) ||
      '';

    if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
      resolved = envUrl.replace(/\/*$/, '');
    } else if (typeof window !== 'undefined' && window && window.location) {
      const { protocol, hostname, port, origin } = window.location;
      if (port === '3000') {
        resolved = `${protocol}//${hostname}:3001`;
      } else if (origin) {
        resolved = origin;
      } else {
        resolved = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
      }
      resolved = resolved.replace(/\/*$/, '');
    }
  } catch {
    // keep default
  }

  // Diagnostics to clearly log the resolved backend URL
  try {
    console.info('[api] Resolved backend base URL:', resolved);
  } catch (_) {}

  return resolved;
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
  const safeBase = typeof base === 'string' ? base.replace(/\/*$/, '') : '';
  // Ensure path has leading slash and ends with trailing slash as required
  const hasLeading = path.startsWith('/');
  const hasTrailing = path.endsWith('/');
  const normalizedPath = `${hasLeading ? '' : '/'}${path}${hasTrailing ? '' : '/'}`;
  const url = `${safeBase}${normalizedPath}`;

  const method = (init && init.method) || 'GET';
  // Log outgoing request for diagnostics
  try {
    console.debug('[api] request', { method, url, init });
  } catch (_) {
    // ignore logging errors
  }

  let resp;
  try {
    resp = await fetch(url, init);
  } catch (networkErr) {
    // Provide a consistent error shape
    const err = new Error('Network error while contacting backend');
    err.cause = networkErr;
    err.url = url;

    // Helpful hint for mixed-content or CORS in browser env
    if (typeof window !== 'undefined') {
      err.hint = 'Check backend availability, CORS, and protocol/port.';
    }

    try {
      console.error('[api] network error', { method, url, error: networkErr?.message || networkErr });
    } catch (_) {}
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

    try {
      console.error('[api] response error', { method, url, status: resp.status, statusText: resp.statusText, detail });
    } catch (_) {}
    throw err;
  }

  try {
    console.debug('[api] response ok', { method, url, status: resp.status });
  } catch (_) {}

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
  // Ensure trailing slash in endpoint per backend spec
  return doFetch('/api/qa/ask/', buildRequestInit('POST', payload));
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
  // Ensure trailing slash in endpoint per backend spec
  return doFetch('/api/qa/history/', buildRequestInit('GET'));
}
