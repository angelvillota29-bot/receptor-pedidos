import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, deleteOrder } from '../lib/api';
import TicketCard from './TicketCard';

const REFRESH_MS = 20000;

export default function PedidosTab({ onLastUpdate, refreshSignal }) {
  const [orders, setOrders] = useState([]);
  const [notConfigured, setNotConfigured] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await fetchOrders();
      if (!data.success) {
        setNotConfigured(data.error === 'no_configurado');
        return;
      }
      setNotConfigured(false);
      setOrders(data.orders || []);
      onLastUpdate(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Error cargando pedidos:', e);
    }
  }, [onLastUpdate]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, REFRESH_MS);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    if (refreshSignal > 0) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const onDelete = async (id) => {
    if (!confirm('¿Eliminar este ticket? Ya no se podrá recuperar.')) return;
    try {
      const data = await deleteOrder(id);
      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id != id));
      } else {
        alert('No se pudo eliminar: ' + (data.error || 'error desconocido'));
      }
    } catch {
      alert('No se pudo eliminar el ticket, intenta de nuevo.');
    }
  };

  return (
    <section>
      {notConfigured && (
        <div className="config-warning">
          ⚠️ Falta configurar <code>RESTAURANTE_API_URL</code> y/o <code>RESTAURANTE_API_KEY</code> como variables de entorno de este servicio.
        </div>
      )}
      {orders.length === 0 ? (
        <p className="empty-msg">No hay pedidos por ahora. Los nuevos pedidos aparecen solos aquí (se actualiza cada 20 segundos).</p>
      ) : (
        <main className="orders-grid">
          {orders.map((o) => (
            <TicketCard key={o.id} order={o} onDelete={onDelete} />
          ))}
        </main>
      )}
    </section>
  );
}
