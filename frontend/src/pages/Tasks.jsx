import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, EmptyState } from '../components/helpers.jsx';

export default function Tasks({ showToast, user }) {
  const [tasks, setTasks] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({});
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });

  useEffect(() => {
    api.list('tasks', filters).then(r => setTasks(r.results || r)).catch(e => showToast?.(e.message, 'error'));
  }, [JSON.stringify(filters), reload]);

  useEffect(() => {
    if (user?.is_admin) {
      api.list('users').then(r => setUsers(r.results || r)).catch(() => {});
    }
  }, [user]);

  async function create(e) {
    e.preventDefault();
    try {
      const body = { ...form };
      if (!body.assigned_to) delete body.assigned_to;
      if (!body.due_date) delete body.due_date;
      await api.create('tasks', body);
      showToast?.('Task created', 'good');
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function updateStatus(task, status) {
    try {
      await api.update('tasks', task.id, { status });
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function addComment(task, body) {
    if (!body.trim()) return;
    try {
      await api.create('task-comments', { task: task.id, body });
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function remove(id) {
    if (!window.confirm('Delete task?')) return;
    try {
      await api.remove('tasks', id);
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="filters">
        <div className="form-row"><label>Status</label>
          <select value={filters.status || ''} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="form-row"><label>Priority</label>
          <select value={filters.priority || ''} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">Any</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="form-row"><label>Assigned to me</label>
          <select value={filters.mine || ''} onChange={e => setFilters(f => ({ ...f, mine: e.target.value }))}>
            <option value="">All</option>
            <option value="1">Yes</option>
          </select>
        </div>
        <div className="form-row"><label>Search</label>
          <input value={filters.q || ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} placeholder="Title…" />
        </div>
      </div>

      <form className="card" onSubmit={create}>
        <h3>New task</h3>
        <div className="grid grid-3">
          <div className="form-row"><label>Title *</label>
            <input required value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} />
          </div>
          <div className="form-row"><label>Assign to</label>
            <select value={form.assigned_to} onChange={e => setForm(s => ({ ...s, assigned_to: e.target.value }))}>
              <option value="">—</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role || 'n/a'})</option>)}
            </select>
          </div>
          <div className="form-row"><label>Priority</label>
            <select value={form.priority} onChange={e => setForm(s => ({ ...s, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-row"><label>Due date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(s => ({ ...s, due_date: e.target.value }))} />
          </div>
          <div className="form-row" style={{ gridColumn: 'span 2' }}><label>Description</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
          </div>
        </div>
        <button className="btn" type="submit">Create task</button>
      </form>

      {tasks == null ? <div className="card">Loading…</div>
       : tasks.length === 0 ? <EmptyState>No tasks match filters.</EmptyState>
       : (
        <div className="grid grid-2">
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} user={user}
              onStatus={s => updateStatus(t, s)}
              onComment={b => addComment(t, b)}
              onDelete={() => remove(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, user, onStatus, onComment, onDelete }) {
  const [comment, setComment] = useState('');
  return (
    <div className="task-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div className="task-title">{task.title}</div>
        <div className="inline">
          <Badge value={task.priority} />
          <Badge value={task.status} />
        </div>
      </div>
      {task.description && <div style={{ fontSize: 13 }}>{task.description}</div>}
      <div className="task-meta">
        <span>Assigned: <b>{task.assigned_to_username || '—'}</b></span>
        <span>By: {task.created_by_username || '—'}</span>
        {task.due_date && <span>Due: {task.due_date}</span>}
      </div>
      <div className="inline">
        {['open', 'in_progress', 'blocked', 'done'].map(s => (
          <button key={s} className={`btn btn-sm ${task.status === s ? '' : 'btn-ghost'}`} onClick={() => onStatus(s)}>{s.replace('_', ' ')}</button>
        ))}
        {user?.is_admin && <button className="btn btn-sm btn-danger" onClick={onDelete}>Delete</button>}
      </div>

      {task.comments && task.comments.length > 0 && (
        <div className="task-comments">
          {task.comments.map(c => (
            <div key={c.id} style={{ padding: '4px 0' }}>
              <b>{c.author_username}</b> <span className="muted">{new Date(c.created_at).toLocaleString()}</span>
              <div>{c.body}</div>
            </div>
          ))}
        </div>
      )}
      <div className="inline" style={{ marginTop: 6 }}>
        <input placeholder="Follow-up comment…" value={comment} onChange={e => setComment(e.target.value)} />
        <button className="btn btn-sm" type="button" onClick={() => { onComment(comment); setComment(''); }}>Post</button>
      </div>
    </div>
  );
}
