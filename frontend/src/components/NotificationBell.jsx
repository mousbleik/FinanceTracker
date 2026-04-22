import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Math.max(0, (Date.now() - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();

  async function loadCount() {
    try {
      const r = await api.notifications.unreadCount();
      setUnread(r.count || 0);
    } catch {}
  }
  async function loadRecent() {
    setLoading(true);
    try {
      const r = await api.notifications.list({ page_size: 10 });
      setItems(r.results || r || []);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => {
    loadCount();
    const iv = setInterval(loadCount, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!open) return;
    loadRecent();
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function handleClickItem(n) {
    try {
      if (!n.read) await api.notifications.markRead(n.id);
    } catch {}
    setOpen(false);
    loadCount();
    loadRecent();
    if (n.url) navigate(n.url);
  }

  async function handleMarkAll() {
    try { await api.notifications.markAllRead(); } catch {}
    await loadCount();
    await loadRecent();
  }

  return (
    <div className="notif-root" ref={rootRef}>
      <button
        className="icon-btn notif-btn"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="notif-menu">
          <div className="notif-head">
            <strong>Notifications</strong>
            <button className="linkish" onClick={handleMarkAll} disabled={!unread}>
              Mark all read
            </button>
          </div>
          <div className="notif-list">
            {loading && <div className="notif-empty">Loading…</div>}
            {!loading && items.length === 0 && (
              <div className="notif-empty">You're all caught up.</div>
            )}
            {items.map(n => (
              <button
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => handleClickItem(n)}
              >
                <div className="notif-title">{n.title}</div>
                {n.body && <div className="notif-body">{n.body}</div>}
                <div className="notif-meta">
                  <span>{n.kind_label}</span>
                  <span>·</span>
                  <span>{timeAgo(n.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="notif-foot">
            <Link to="/notifications" onClick={() => setOpen(false)}>View all</Link>
          </div>
        </div>
      )}
    </div>
  );
}
