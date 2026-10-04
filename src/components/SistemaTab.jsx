import { useState } from 'react';
import { reiniciarSistema } from '../lib/api';

// Solo el administrador total ve esta pestaña. Borra los datos de OPERACIÓN
// (pedidos, historial, gastos) para empezar la producción real en limpio.
export default function SistemaTab() {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const reiniciar = async (e) => {
    e.preventDefault();
    if (texto.trim() !== 'REINICIAR') return;
    if (!confirm('ÚLTIMA ADVERTENCIA: se borrarán todos los pedidos, el historial de ventas y los gastos. ¿Seguro que quieres dejar el sistema vacío?')) return;
    setEnviando(true);
    setError('');
    setResultado(null);
    try {
      const r = await reiniciarSistema(texto.trim());
      if (r.success) {
        setResultado(r.borrado);
        setTexto('');
      } else {
        setError(r.error === 'no_configurado' ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY.' : r.error || 'No se pudo reiniciar.');
      }
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
    setEnviando(false);
  };

  return (
    <section style={{ padding: 20, maxWidth: 720 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginTop: 0 }}>Sistema</h2>

      <div className="zona-peligro">
        <h3>⚠️ Reiniciar todo el sistema</h3>
        <p>Úsalo <strong>una sola vez</strong>, justo antes de empezar la producción real, para que no quede ningún dato de pruebas.</p>
        <div className="zona-listas">
          <div>
            <strong>Se borra:</strong>
            <ul>
              <li>Los pedidos que están en la cola</li>
              <li>Todo el historial de ventas</li>
              <li>El registro de pedidos eliminados</li>
              <li>Los gastos y compras</li>
              <li>El stock vuelve al valor del día</li>
            </ul>
          </div>
          <div>
            <strong>NO se borra:</strong>
            <ul>
              <li>El menú, categorías y fotos</li>
              <li>Horarios y precios</li>
              <li>Los usuarios y el acceso de meseros</li>
              <li>Las configuraciones y conexiones</li>
            </ul>
          </div>
        </div>
        <p style={{ fontSize: 12 }}>Antes de borrar se guarda una copia de seguridad privada en el servidor, por si el reinicio fue un error.</p>

        <form onSubmit={reiniciar} style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
            Para confirmar, escribe la palabra <strong>REINICIAR</strong>:
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={texto} onChange={(e) => setTexto(e.target.value)} className="gasto-input" style={{ maxWidth: 220 }} placeholder="REINICIAR" autoComplete="off" />
            <button type="submit" className="btn-peligro" disabled={enviando || texto.trim() !== 'REINICIAR'}>
              {enviando ? 'Reiniciando…' : 'Reiniciar todo el sistema'}
            </button>
          </div>
        </form>

        {error && <p style={{ color: 'var(--brand-danger)', fontSize: 13 }}>{error}</p>}
        {resultado && (
          <p style={{ color: 'var(--brand-success)', fontSize: 13 }}>
            ✅ Listo. Se borraron {resultado.pedidosEnHistorial ?? 0} pedidos del historial, {resultado.pedidosEnCola ?? 0} de la cola y {resultado.gastos ?? 0} gastos. El sistema quedó vacío.
          </p>
        )}
      </div>
    </section>
  );
}
