import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Broadcast({ showToast }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function send(e) {
    e.preventDefault();
    setSending(true);
    try {
      const form = new FormData();
      form.append('subject', subject);
      form.append('body', body);
      for (const f of files) form.append('attachments', f);
      const r = await api.broadcast(form);
      setLastResult(r);
      showToast?.(`Sent to ${r.sent} standard user(s)`, 'good');
      setSubject(''); setBody(''); setFiles([]);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
      <form className="card" onSubmit={send}>
        <h3>Email all Standard users</h3>
        <p className="sub" style={{ marginBottom: 12 }}>
          The email is sent BCC to every Standard-role user with an email on file.
          In local dev, the console email backend prints the message to the Django server output.
        </p>
        <div className="form-row"><label>Subject *</label>
          <input required value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div className="form-row"><label>Body *</label>
          <textarea required rows={8} value={body} onChange={e => setBody(e.target.value)} />
        </div>
        <div className="form-row"><label>Attachments</label>
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files))} />
          {files.length > 0 && (
            <div className="sub">Selected: {files.map(f => f.name).join(', ')}</div>
          )}
        </div>
        <button className="btn" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send broadcast'}
        </button>
      </form>

      {lastResult && (
        <div className="card">
          <h3>Last send</h3>
          <div>Sent to <b>{lastResult.sent}</b> recipient(s).</div>
          <ul style={{ marginTop: 8 }}>
            {lastResult.recipients && lastResult.recipients.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
