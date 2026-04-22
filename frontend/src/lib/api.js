const BASE = '';

function getToken() {
  return localStorage.getItem('token') || '';
}
function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}
function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function setUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

async function request(path, { method = 'GET', body, headers, isForm } = {}) {
  const h = { Accept: 'application/json', ...(headers || {}) };
  const token = getToken();
  if (token) h.Authorization = `Token ${token}`;
  if (!isForm && body !== undefined) h['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const ctype = res.headers.get('content-type') || '';
  let data = null;
  if (ctype.includes('application/json')) data = await res.json();
  else data = await res.text();

  if (!res.ok) {
    const err = new Error(
      (data && (data.detail || JSON.stringify(data))) || res.statusText
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  token: { get: getToken, set: setToken },
  user: { get: getUser, set: setUser },

  login: (username, password) =>
    request('/api/auth/login/', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/auth/logout/', { method: 'POST' }),
  me: () => request('/api/auth/me/'),

  list: (resource, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/api/${resource}/${qs ? '?' + qs : ''}`);
  },
  retrieve: (resource, id) => request(`/api/${resource}/${id}/`),
  create: (resource, body) => request(`/api/${resource}/`, { method: 'POST', body }),
  update: (resource, id, body) =>
    request(`/api/${resource}/${id}/`, { method: 'PATCH', body }),
  remove: (resource, id) =>
    request(`/api/${resource}/${id}/`, { method: 'DELETE' }),

  upload: (path, formData) =>
    request(path, { method: 'POST', body: formData, isForm: true }),

  dashboard: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/api/reports/dashboard/${qs ? '?' + qs : ''}`);
  },
  report: (name, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return request(`/api/reports/${name}/${qs ? '?' + qs : ''}`);
  },
  reportCsvUrl: (name, params = {}) => {
    const p = { ...params, format: 'csv' };
    const qs = new URLSearchParams(
      Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    return `/api/reports/${name}/?${qs}`;
  },
  broadcast: (formData) =>
    request('/api/broadcast/email/', { method: 'POST', body: formData, isForm: true }),

  notifications: {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      return request(`/api/notifications/${qs ? '?' + qs : ''}`);
    },
    unreadCount: () => request('/api/notifications/unread_count/'),
    markRead: (id) => request(`/api/notifications/${id}/mark_read/`, { method: 'POST' }),
    markAllRead: () => request('/api/notifications/mark_all_read/', { method: 'POST' }),
  },
};
