import { useEffect, useMemo, useState } from 'react';
import { fetchHistorial, gastosApi, confirmarPago, eliminarPedido } from '../lib/api';
import { formatoCOP, formatoHoraCorta, formatoFechaISO, fechaISOHaceDias, hoyISO, CANAL_LABEL, PAGO_LABEL } from '../lib/format';
import { generarReporteExcel, rangoDelMes, nombreArchivo } from '../lib/reporteExcel';

function estadoPago(p) {
  if (p.pagoConfirmado === false) return 'Pendiente';
  if (p.pagoConfirmadoAt) return `✔ Confirmado ${formatoHoraCorta(p.pagoConfirmadoAt)}`;
  return '✔ Confirmado (anterior al control de pagos)';
}

export default function HistorialTab() {
  const [pedidos, setPedidos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [error, setError] = useState('');
  const [gastoDescripcion, setGastoDescripcion] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoError, setGastoError] = useState('');
  const [generando, setGenerando] = useState('');

  const cargarPedidos = async () => {
    try {
      const data = await fetchHistorial();
      if (!data.success) {
        setError(data.error === 'no_configurado' ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY.' : 'No se pudo cargar el historial.');
        return;
      }
      setError('');
      setPedidos(data.pedidos || []);
    } catch {
      console.error('Error cargando historial');
    }
  };

  const cargarGastos = async () => {
    try {
      const data = await gastosApi({ accion: 'listar' });
      if (data.success) setGastos(data.gastos || []);
    } catch {
      console.error('Error cargando gastos');
    }
  };

  useEffect(() => {
    cargarPedidos();
    cargarGastos();
  }, []);

  // Solo cuentan como venta los pedidos con el pago confirmado (los anteriores
  // a esta función no traen la marca y cuentan como confirmados).
  const todosDelDia = useMemo(() => pedidos.filter((p) => formatoFechaISO(p.createdAt) === fecha), [pedidos, fecha]);
  const delDia = useMemo(() => todosDelDia.filter((p) => p.pagoConfirmado !== false), [todosDelDia]);
  const sinConfirmar = useMemo(() => todosDelDia.filter((p) => p.pagoConfirmado === false), [todosDelDia]);
  const totalVentas = delDia.reduce((acc, p) => acc + (p.total || 0), 0);

  const confirmarDesdeHistorial = async (id) => {
    try {
      const data = await confirmarPago(id);
      if (!data.success) {
        alert('No se pudo confirmar el pago: ' + (data.error || 'error desconocido'));
        return;
      }
      cargarPedidos();
    } catch {
      alert('No se pudo confirmar el pago, intenta de nuevo.');
    }
  };

  // Solo se pueden eliminar pedidos de hoy y de ayer (por un pedido cancelado o
  // con error). Pasado ese plazo la opción desaparece sola y el servidor tampoco
  // la permite.
  const puedeEliminar = (p) => formatoFechaISO(p.createdAt) >= fechaISOHaceDias(1);
  const eliminarDelHistorial = async (p) => {
    const quien = p.cliente?.nombre || 'sin nombre';
    if (!confirm(`¿Eliminar el pedido de ${quien} por ${formatoCOP(p.total)}?\n\nSe borra del Historial y deja de contar en las ventas. Solo se puede hacer con pedidos de hoy y de ayer. Queda registrado quién lo eliminó.`)) return;
    try {
      const data = await eliminarPedido(p.id);
      if (!data.success) {
        alert('No se pudo eliminar: ' + (data.error || 'error desconocido'));
        return;
      }
      cargarPedidos();
    } catch {
      alert('No se pudo eliminar el pedido, intenta de nuevo.');
    }
  };

  const gastosDelDia = useMemo(() => gastos.filter((g) => g.fecha === fecha), [gastos, fecha]);
  const totalGastos = gastosDelDia.reduce((acc, g) => acc + (g.monto || 0), 0);
  const ganancia = totalVentas - totalGastos;

  const agregarGasto = async (e) => {
    e.preventDefault();
    setGastoError('');
    const montoNum = Number(String(gastoMonto).replace(/\D/g, ''));
    if (!gastoDescripcion.trim() || !montoNum) {
      setGastoError('Escribe una descripción y un monto válido.');
      return;
    }
    try {
      const data = await gastosApi({ accion: 'crear', descripcion: gastoDescripcion.trim(), monto: montoNum, fecha });
      if (!data.success) {
        setGastoError(data.error || 'No se pudo guardar el gasto.');
        return;
      }
      setGastoDescripcion('');
      setGastoMonto('');
      cargarGastos();
    } catch {
      setGastoError('No se pudo conectar con el servidor.');
    }
  };

  const eliminarGasto = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await gastosApi({ accion: 'eliminar', id }).catch(() => {});
    cargarGastos();
  };

  const mes = rangoDelMes(fecha);

  // Reporte en Excel (varias hojas con formato). "dia" = solo la fecha elegida;
  // "mes" = del 1 al último día del mes de la fecha elegida (28, 29, 30 o 31).
  const descargarExcel = async (alcance) => {
    const desde = alcance === 'mes' ? mes.desde : fecha;
    const hasta = alcance === 'mes' ? mes.hasta : fecha;
    setGenerando(alcance);
    try {
      const blob = await generarReporteExcel({ pedidos, gastos, desde, hasta });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo(desde, hasta);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error(e);
      alert('No se pudo generar el Excel, intenta de nuevo.');
    } finally {
      setGenerando('');
    }
  };

  return (
    <section className="historial-wrap">
      <div className="print-header">
        <div className="print-marca">The Club Housse</div>
        <div className="print-subtitulo">Reporte del día {fecha}</div>
      </div>

      <div className="historial-toolbar no-print">
        <label>
          Día: <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <button className="tab-btn" onClick={() => descargarExcel('dia')} disabled={!!generando}>
          {generando === 'dia' ? 'Generando…' : '⬇️ Excel del día'}
        </button>
        <button className="tab-btn" onClick={() => descargarExcel('mes')} disabled={!!generando} title={`Del ${mes.desde} al ${mes.hasta}`}>
          {generando === 'mes' ? 'Generando…' : `⬇️ Excel del mes completo (${mes.nombre}, 1–${mes.ultimo})`}
        </button>
      </div>

      <div className="resumen-dia">
        <div className="resumen-item">
          <span>Ventas</span>
          <strong>{formatoCOP(totalVentas)}</strong>
        </div>
        <div className="resumen-item">
          <span>Gastos</span>
          <strong>{formatoCOP(totalGastos)}</strong>
        </div>
        <div className="resumen-item resumen-ganancia">
          <span>Ganancia</span>
          <strong>{formatoCOP(ganancia)}</strong>
        </div>
      </div>

      {error && <p className="empty-msg">{error}</p>}
      {!error && (
        <>
          <h3 className="historial-subtitulo">Pedidos ({delDia.length})</h3>
          {delDia.length === 0 ? (
            <p className="empty-msg">No hay pedidos con pago confirmado ese día.</p>
          ) : (
            <table className="historial-tabla">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Cliente</th>
                  <th>Canal</th>
                  <th>Método</th>
                  <th>Estado del pago</th>
                  <th>Despacho</th>
                  <th>Total</th>
                  <th className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {delDia.map((p, i) => (
                  <tr key={i}>
                    <td>{formatoHoraCorta(p.createdAt)}</td>
                    <td>{p.cliente?.nombre || ''}</td>
                    <td>{CANAL_LABEL[p.canal] || p.canal || ''}</td>
                    <td>{PAGO_LABEL[p.metodoPago] || p.metodoPago || ''}</td>
                    <td title={p.pagoConfirmadoPor ? `Confirmó: ${p.pagoConfirmadoPor}` : ''}>{estadoPago(p)}</td>
                    <td>{p.despachadoAt ? `Despachado ${formatoHoraCorta(p.despachadoAt)}` : '—'}</td>
                    <td>{formatoCOP(p.total)}</td>
                    <td className="no-print">
                      {puedeEliminar(p) && (
                        <button className="btn-eliminar-mini" onClick={() => eliminarDelHistorial(p)} title="Eliminar este pedido (solo hoy y ayer)">
                          🗑 Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {!error && sinConfirmar.length > 0 && (
        <>
          <h3 className="historial-subtitulo">Sin pago confirmado ({sinConfirmar.length})</h3>
          <p className="historial-aviso">Estos pedidos no cuentan como venta hasta que confirmes el pago.</p>
          <table className="historial-tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Pago</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sinConfirmar.map((p) => (
                <tr key={p.id}>
                  <td>{formatoHoraCorta(p.createdAt)}</td>
                  <td>{p.cliente?.nombre || ''}</td>
                  <td>{PAGO_LABEL[p.metodoPago] || p.metodoPago || ''}</td>
                  <td>{formatoCOP(p.total)}</td>
                  <td className="no-print">
                    <button className="btn-confirmar-mini" onClick={() => confirmarDesdeHistorial(p.id)}>
                      ✅ Confirmar pago
                    </button>{' '}
                    {puedeEliminar(p) && (
                      <button className="btn-eliminar-mini" onClick={() => eliminarDelHistorial(p)} title="Eliminar este pedido (solo hoy y ayer)">
                        🗑 Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="historial-subtitulo">Gastos / compras del día</h3>
      <form onSubmit={agregarGasto} className="gasto-form no-print">
        <input type="text" placeholder="Ej. Bolsa de papas" value={gastoDescripcion} onChange={(e) => setGastoDescripcion(e.target.value)} className="gasto-input" />
        <input type="text" inputMode="numeric" placeholder="Monto" value={gastoMonto} onChange={(e) => setGastoMonto(e.target.value)} className="gasto-input gasto-input-monto" />
        <button type="submit" className="tab-btn">
          Agregar
        </button>
      </form>
      {gastoError && <p style={{ color: 'var(--brand-danger)', fontSize: 13, padding: '0 20px', margin: '4px 0 0' }}>{gastoError}</p>}

      {gastosDelDia.length === 0 ? (
        <p className="empty-msg">No hay gastos registrados ese día.</p>
      ) : (
        <table className="historial-tabla">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Monto</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {gastosDelDia.map((g) => (
              <tr key={g.id}>
                <td>{g.descripcion}</td>
                <td>{formatoCOP(g.monto)}</td>
                <td className="no-print">
                  <button className="btn-delete" style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }} onClick={() => eliminarGasto(g.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
