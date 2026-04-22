import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { EmptyState } from '../components/helpers.jsx';

const SOURCES = [
  { id: 'shopify', title: 'Shopify orders', path: '/api/imports/shopify-orders/', hint: 'Export Orders from Shopify admin as CSV.' },
  { id: 'stripe', title: 'Stripe payouts / balance', path: '/api/imports/stripe-payouts/', hint: 'Upload a balance report CSV from Stripe.' },
  { id: 'generic', title: 'Generic expenses', path: '/api/imports/expenses-generic/', hint: 'Columns: date, vendor, category, currency, amount, account, memo' },
];

export default function Imports({ showToast }) {
  const [batches, setBatches] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.list('imports').then(r => setBatches(r.results || r)).catch(() => {});
  }, [reload]);

  async function upload(path, file) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await api.upload(path, form);
      showToast(`Imported ${r.success_count}/${r.row_count} rows`, 'good');
      setReload(x => x + 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid grid-3">
        {SOURCES.map(s => (
          <div className="card" key={s.id}>
            <h3>{s.title}</h3>
            <div className="sub" style={{ marginBottom: 8 }}>{s.hint}</div>
            <input type="file" accept=".csv,text/csv" onChange={e => upload(s.path, e.target.files[0])} />
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 12 }}>Import history</h3>
      {batches == null ? <div className="card">Loading…</div>
       : batches.length === 0 ? <EmptyState>No imports yet.</EmptyState>
       : (
        <table className="table">
          <thead><tr>
            <th>When</th><th>Source</th><th className="right">Rows</th><th className="right">OK</th><th className="right">Errors</th><th>Log</th>
          </tr></thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id}>
                <td>{new Date(b.created_at).toLocaleString()}</td>
                <td>{b.source_label}</td>
                <td className="right">{b.row_count}</td>
                <td className="right">{b.success_count}</td>
                <td className="right" style={{ color: b.error_count ? 'var(--danger)' : 'inherit' }}>{b.error_count}</td>
                <td style={{ whiteSpace: 'pre-wrap', fontSize: 11, maxWidth: 300 }}>{b.log}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
