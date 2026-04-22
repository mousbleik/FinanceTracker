import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'order_created', label: 'Orders' },
  { value: 'expense_created', label: 'Expenses' },
  { value: 'payment_created', label: 'Payments' },
  { value: 'asset_created', label: 'Assets' },
  { value: 'liability_created', label: 'Liabilities' },
  { value: 'customer_created', label: 'Customers' },
  { value: 'vendor_created', label: 'Vendors' },
  { value: 'task_assigned', label: 'Tasks assigned' },
  { value: 'task_status_changed', label: 'Task status' },
  { value: 'task_commented', label: 'Task comments' },
  { value: 'import_completed', label: 'Imports' },
  { value: 'broadcast_sent', label: 'Broadcasts' },
];

export default function Notifications({ showToast }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (kind) params.kind = kind;
      if (onlyUnread) params.unread = '1';
      const r = await api.notifications.list(params);
      setRows(r.results || []);
      setCount(r.count ?? (r.results ? r.results.length : 0));
      setNext(r.next || null);
    } catch (e) {
      showToast && showToast(e.message || 'Failed to load notifications', 'bad');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [kind, onlyUnread]);

  async function handleRowClick(n) {
    try { if (!n.read) await api.notifications.markRead(n.id); } catch {}
    if (n.url) navigate(n.url);
    else load();
  }

  async function handleMarkAll() {
    try {
      const r = await api.notifications.markAllRead();
      showToast && showToast(`Marked ${r.updated} notification(s) as read`, 'good');
      load();
    } catch (e) {
      showToast && showToast(e.message || 'Failed', 'bad');
    }
  }

  return (
    <div className="page">
      <div className="filters">
        <select value={kind} onChange={e => setKind(e.target.value)}>
          {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={e => setOnlyUnread(e.target.checked)}
          /> Only unread
        </label>
        <span className="muted">{count} total</span>
        <button className="btn" onClick={handleMarkAll}>Mark all read</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Type</th>
              <th>Title</th>
              <th>Details</th>
              <th>From</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="muted">No notifications.</td></tr>
            )}
            {rows.map(n => (
              <tr
                key={n.id}
                className={n.read ? '' : 'row-unread'}
                onClick={() => handleRowClick(n)}
                style={{ cursor: n.url ? 'pointer' : 'default' }}
              >
                <td>{n.read ? '·' : <span className="dot" />}</td>
                <td>{n.kind_label}</td>
                <td>{n.title}</td>
                <td className="muted">{n.body}</td>
                <td>{n.actor_username || '—'}</td>
                <td>{new Date(n.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {next && <div className="muted">More older notifications available — refine filters to narrow.</div>}
    </div>
  );
}
