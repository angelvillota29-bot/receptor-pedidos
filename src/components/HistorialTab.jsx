import { useEffect, useMemo, useState } from 'react';
import { fetchHistorial } from '../lib/api';
import { formatoCOP, formatoHoraCorta, formatoFechaISO, hoyISO, CANAL_LABEL, PAGO_LABEL } from '../lib/format';

export default function HistorialTab() {
  const [pedidos, setPedidos] = useState([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchHistorial();
        if (!data.success) {
          setError(data.error === 'no_configurado' ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY.' : 'No se pudo cargar el historial.');
          return;
        }
        setPedidos(data.pedidos || []);
      } catch {
        console.error('Error cargando historial');
      }
    })();
  }, []);

  const delDia = useMemo(() => pedidos.filter((p) => formatoFechaISO(p.createdAt) === fecha), [pedidos, fecha]);
  const total = delDia.reduce((acc, p) => acc + (p.total || 0), 0);

  const descargarCsv = () => {
    const filas = [['Hora', 'Cliente', 'Telefono', 'Canal', 'Metodo de pago', 'Total']];
    for (const p of delDia) {
      filas.push([formatoHoraCorta(p.createdAt), p.cliente?.nombre || '', p.cliente?.telefono || '', CANAL_LABEL[p.canal] || p.canal || '', PAGO_LABEL[p.metodoPago] || p.metodoPago || '', String(p.total || 0)]);
    }
    filas.push([]);
    filas.push(['', '', '', '', 'Total del día', String(total)]);
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div className="historial-toolbar">
        <label>
          Día: <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <span className="historial-total">
          Total del día: {formatoCOP(total)} ({delDia.length} pedido{delDia.length === 1 ? '' : 's'})
        </span>
        <button className="tab-btn" onClick={() => window.print()}>
          🖨️ Imprimir
        </button>
        <button className="tab-btn" onClick={descargarCsv}>
          ⬇️ Descargar CSV
        </button>
      </div>

      {error && <p className="empty-msg">{error}</p>}
      {!error && delDia.length === 0 ? (
        <p className="empty-msg">No hay pedidos registrados ese día.</p>
      ) : (
        !error && (
          <table className="historial-tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Canal</th>
                <th>Pago</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {delDia.map((p, i) => (
                <tr key={i}>
                  <td>{formatoHoraCorta(p.createdAt)}</td>
                  <td>{p.cliente?.nombre || ''}</td>
                  <td>{CANAL_LABEL[p.canal] || p.canal || ''}</td>
                  <td>{PAGO_LABEL[p.metodoPago] || p.metodoPago || ''}</td>
                  <td>{formatoCOP(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
  );
}
