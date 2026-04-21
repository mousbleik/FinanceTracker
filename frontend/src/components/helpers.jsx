import React from 'react';

export function fmt(n, currency = 'USD') {
  if (n == null || isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${Number(n).toFixed(2)}`;
  }
}

export function Pct({ value }) {
  if (value == null) return <span className="muted">—</span>;
  return <span>{(value).toFixed(1)}%</span>;
}

export function Badge({ value }) {
  if (!value) return null;
  const cls = 'badge b-' + String(value).toLowerCase().replace(/\s+/g, '_');
  return <span className={cls}>{String(value).replace('_', ' ')}</span>;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function firstOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function EmptyState({ children = 'No records yet.' }) {
  return <div className="empty-state">{children}</div>;
}

export function useList(loader, deps = []) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    loader()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  return { data, error, reload: () => setReloadKey(k => k + 1) };
}
