import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import TopBar from './components/TopBar';
import PedidosTab from './components/PedidosTab';
import HistorialTab from './components/HistorialTab';
import AnaliticasTab from './components/AnaliticasTab';
import UsuariosTab from './components/UsuariosTab';

export default function App() {
  const { user, hasAccess, logout, ready } = useAuth();
  const [tab, setTab] = useState('pedidos');
  const [lastUpdate, setLastUpdate] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  if (!ready) return null;
  if (!user) return <LoginScreen />;

  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6ede0', padding: 20 }}>
        <div style={{ background: '#fff', border: '2px solid var(--brand-card-border)', borderRadius: 16, padding: '28px 32px', maxWidth: 360, textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--brand-text-dark)', marginTop: 0 }}>Sin acceso</h2>
          <p style={{ fontSize: 13, color: '#6b5a4d' }}>
            Tu cuenta ({user}) no tiene permiso para ver la cola de pedidos. Pídele al administrador que te agregue.
          </p>
          <button onClick={logout} className="tab-btn" style={{ marginTop: 10 }}>
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopBar tab={tab} onTab={setTab} lastUpdate={lastUpdate} onRefresh={() => setRefreshSignal((n) => n + 1)} />
      {/* Pedidos se mantiene montado siempre para no perder el polling ni el último ticket visto. */}
      <div style={{ display: tab === 'pedidos' ? 'block' : 'none' }}>
        <PedidosTab onLastUpdate={setLastUpdate} refreshSignal={refreshSignal} />
      </div>
      {tab === 'historial' && <HistorialTab />}
      {tab === 'analiticas' && <AnaliticasTab />}
      {tab === 'usuarios' && <UsuariosTab />}
    </div>
  );
}
