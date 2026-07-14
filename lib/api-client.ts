export async function getCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/auth/csrf-token');
    const data = await safeParseJson(res);
    return data.csrfToken || '';
  } catch (e) {
    console.error('Failed to retrieve CSRF token:', e);
    return '';
  }
}

export function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  const headers = new Headers(options.headers || {});

  if (isStateChanging) {
    let csrfToken = getCookie('ww_csrf');
    if (!csrfToken) {
      csrfToken = await getCsrfToken();
    }
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  // Ensure content-type defaults to JSON if sending a body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function safeParseJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    try {
      const text = await res.text();
      console.error('Expected JSON, but received:', text.slice(0, 200));
    } catch (_) {}
    return { success: false, error: `Invalid server response (Status ${res.status})` };
  }
  try {
    return await res.json();
  } catch (e) {
    console.error('JSON parse error:', e);
    return { success: false, error: 'Malformed response received from server' };
  }
}
