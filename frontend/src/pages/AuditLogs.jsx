import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { EmptyState } from '../components/helpers.jsx';

const ACTIONS = [
  'login_success', 'login_failed', 'logout',
  'create', 'update', 'delete',
  'upload', 'download', 'import_run', 'email_broadcast',
];

export default function AuditLogs({ showToast }) {
  const [logs, setLogs] = useState(null);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    api.list('audit-logs', filters).then(r => setLogs(r.results || r)).catch(e => showToast?.(e.message, 'error'));
  }, [JSON.stringify(filters)]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="filters">
        <div className="form-row"><label>Action</label>
          <select value={filters.action || ''} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
            <option value="">All</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-row"><label>From</label>
          <input type="date" value={filters.from || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div className="form-row"><label>To</label>
          <input type="date" value={filters.to || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
        </div>
        <div className="form-row"><label>Search</label>
          <input value={filters.q || ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="description…" />
        </div>
        <button className="btn btn-ghost" onClick={() => setFilters({})}>Clear</button>
      </div>

      {logs == null ? <div className="card">Loading…</div>
       : logs.length === 0 ? <EmptyState>No audit entries.</EmptyState>
       : (
        <table className="table">
          <thead><tr>
            <th>When</th><th>User</th><th>Action</th><th>Target</th><th>Description</th><th>IP</th>
          </tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{new Date(l.timestamp).toLocaleString()}</td>
                <td>{l.username || '—'}</td>
                <td><b>{l.action}</b></td>
                <td>{l.target_type}{l.target_id ? `#${l.target_id}` : ''}</td>
                <td>{l.description}</td>
                <td className="muted">{l.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
