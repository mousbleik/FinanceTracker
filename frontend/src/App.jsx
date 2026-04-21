import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Link, NavLink } from 'react-router-dom';
import { api } from './lib/api';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Orders from './pages/Orders.jsx';
import Expenses from './pages/Expenses.jsx';
import Payments from './pages/Payments.jsx';
import Accounts from './pages/Accounts.jsx';
import Assets from './pages/Assets.jsx';
import Liabilities from './pages/Liabilities.jsx';
import Vendors from './pages/Vendors.jsx';
import Customers from './pages/Customers.jsx';
import Categories from './pages/Categories.jsx';
import Currencies from './pages/Currencies.jsx';
import FxRates from './pages/FxRates.jsx';
import Imports from './pages/Imports.jsx';
import Tasks from './pages/Tasks.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Broadcast from './pages/Broadcast.jsx';
import AuditLogs from './pages/AuditLogs.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '■', section: 'Main' },
  { to: '/orders', label: 'Orders', icon: '▤' },
  { to: '/expenses', label: 'Expenses', icon: '▥' },
  { to: '/payments', label: 'Payments', icon: '↯' },
  { to: '/reports', label: 'Reports', icon: '∑' },
  { to: '/imports', label: 'Imports', icon: '⇪' },
  { to: '/tasks', label: 'Tasks', icon: '✓', section: 'Operations' },
  { to: '/accounts', label: 'Accounts', icon: '$' },
  { to: '/vendors', label: 'Vendors', icon: '◈' },
  { to: '/customers', label: 'Customers', icon: '◉' },
  { to: '/assets', label: 'Assets', icon: '▣' },
  { to: '/liabilities', label: 'Liabilities', icon: '▲' },
  { to: '/categories', label: 'Categories', icon: '☰' },
  { to: '/currencies', label: 'Currencies', icon: '¤', section: 'Setup' },
  { to: '/fxrates', label: 'FX rates', icon: '↔', adminOnly: true },
  { to: '/users', label: 'Users', icon: '♁', adminOnly: true, section: 'Admin' },
  { to: '/broadcast', label: 'Email broadcast', icon: '✉', adminOnly: true },
  { to: '/audit', label: 'Audit log', icon: '📜', adminOnly: true },
];

function Shell({ user, onLogout, children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const isAdmin = user?.is_admin;
  const visibleNav = NAV.filter(n => !n.adminOnly || isAdmin);
  const location = useLocation();
  const title = useMemo(() => {
    const match = NAV.find(n => n.to === location.pathname) ||
      NAV.find(n => n.to !== '/' && location.pathname.startsWith(n.to));
    return match ? match.label : 'Sakan Home';
  }, [location.pathname]);

  return (
    <div className={`app ${drawerOpen ? 'drawer-open' : 'drawer-closed'}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SH</div>
          <span>Sakan Home</span>
        </div>
        {visibleNav.map((n, i) => (
          <React.Fragment key={n.to}>
            {n.section && <div className="nav-section">{n.section}</div>}
            <NavLink
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => window.innerWidth < 800 && setDrawerOpen(false)}
            >
              <span aria-hidden>{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </NavLink>
          </React.Fragment>
        ))}
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setDrawerOpen(d => !d)} aria-label="Toggle menu">☰</button>
          <div className="title">{title}</div>
          <button className="icon-btn" onClick={() => setDark(d => !d)} aria-label="Toggle dark mode">
            {dark ? '☀ Light' : '☾ Dark'}
          </button>
          <span className="muted" style={{ fontSize: 12 }}>{user?.username} · {user?.role}</span>
          <button className="icon-btn" onClick={onLogout}>Log out</button>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(api.user.get());
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && api.token.get()) {
      api.me().then(u => { api.user.set(u); setUser(u); })
        .catch(() => { api.token.set(''); api.user.set(null); });
    }
  }, [user]);

  async function handleLogin(username, password) {
    const res = await api.login(username, password);
    api.token.set(res.token);
    api.user.set(res.user);
    setUser(res.user);
    navigate('/');
    showToast('Welcome ' + res.user.username, 'good');
  }

  async function handleLogout() {
    try { await api.logout(); } catch {}
    api.token.set(''); api.user.set(null); setUser(null);
    navigate('/login');
  }

  function showToast(message, kind = '') {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2500);
  }

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login onSubmit={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
      </>
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard showToast={showToast} />} />
        <Route path="/orders" element={<Orders showToast={showToast} />} />
        <Route path="/expenses" element={<Expenses showToast={showToast} />} />
        <Route path="/payments" element={<Payments showToast={showToast} />} />
        <Route path="/reports" element={<Reports showToast={showToast} />} />
        <Route path="/imports" element={<Imports showToast={showToast} />} />
        <Route path="/tasks" element={<Tasks showToast={showToast} user={user} />} />
        <Route path="/accounts" element={<Accounts showToast={showToast} />} />
        <Route path="/vendors" element={<Vendors showToast={showToast} />} />
        <Route path="/customers" element={<Customers showToast={showToast} />} />
        <Route path="/assets" element={<Assets showToast={showToast} />} />
        <Route path="/liabilities" element={<Liabilities showToast={showToast} />} />
        <Route path="/categories" element={<Categories showToast={showToast} />} />
        <Route path="/currencies" element={<Currencies showToast={showToast} />} />
        <Route path="/fxrates" element={<FxRates showToast={showToast} />} />
        <Route path="/users" element={<Users showToast={showToast} />} />
        <Route path="/broadcast" element={<Broadcast showToast={showToast} />} />
        <Route path="/audit" element={<AuditLogs showToast={showToast} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </Shell>
  );
}
