import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'historial', label: 'Historial' },
  { key: 'usuarios', label: 'Usuarios', adminOnly: true },
];

export default function TopBar({ tab, onTab, lastUpdate, onRefresh }) {
  const { logout, isAdmin } = useAuth();
  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <header className="top-bar">
      <h1 className="brand-title">🎫 Receptor de Pedidos</h1>
      <nav className="tabs">
        {visibleTabs.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => onTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {lastUpdate && <span style={{ fontSize: 12, color: '#e8b98a' }}>Actualizado {lastUpdate}</span>}
        <button onClick={onRefresh} className="tab-btn">
          Actualizar
        </button>
        <button onClick={logout} className="tab-btn">
          Salir
        </button>
      </div>
    </header>
  );
}
