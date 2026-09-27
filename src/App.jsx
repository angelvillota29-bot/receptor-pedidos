import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import TopBar from './components/TopBar';
import PedidosTab from './components/PedidosTab';
import HistorialTab from './components/HistorialTab';
import UsuariosTab from './components/UsuariosTab';

export default function App() {
  const { session } = useAuth();
  const [tab, setTab] = useState('pedidos');
  const [lastUpdate, setLastUpdate] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  if (!session) return <LoginScreen />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopBar tab={tab} onTab={setTab} lastUpdate={lastUpdate} onRefresh={() => setRefreshSignal((n) => n + 1)} />
      {/* Pedidos se mantiene montado siempre para no perder el polling ni el último ticket visto. */}
      <div style={{ display: tab === 'pedidos' ? 'block' : 'none' }}>
        <PedidosTab onLastUpdate={setLastUpdate} refreshSignal={refreshSignal} />
      </div>
      {tab === 'historial' && <HistorialTab />}
      {tab === 'usuarios' && <UsuariosTab />}
    </div>
  );
}
