import { useEffect, useMemo, useState } from 'react';
import { fetchHistorial, gastosApi, confirmarPago } from '../lib/api';
import { formatoCOP, formatoHoraCorta, formatoFechaISO, hoyISO, CANAL_LABEL, PAGO_LABEL } from '../lib/format';

export default function HistorialTab() {
  const [pedidos, setPedidos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [error, setError] = useState('');
  const [gastoDescripcion, setGastoDescripcion] = useState('');
  const [gastoMonto, setGastoMonto] = useState('');
  const [gastoError, setGastoError] = useState('');

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

  const descargarCsv = () => {
    const filas = [['Hora', 'Cliente', 'Telefono', 'Canal', 'Metodo de pago', 'Total']];
    for (const p of delDia) {
      filas.push([formatoHoraCorta(p.createdAt), p.cliente?.nombre || '', p.cliente?.telefono || '', CANAL_LABEL[p.canal] || p.canal || '', PAGO_LABEL[p.metodoPago] || p.metodoPago || '', String(p.total || 0)]);
    }
    filas.push([]);
    filas.push(['', '', '', '', 'Total ventas', String(totalVentas)]);
    filas.push([]);
    filas.push(['Gasto', '', '', '', '', 'Monto']);
    for (const g of gastosDelDia) {
      filas.push([g.descripcion, '', '', '', '', String(g.monto || 0)]);
    }
    filas.push([]);
    filas.push(['', '', '', '', 'Total gastos', String(totalGastos)]);
    filas.push(['', '', '', '', 'Ganancia del día', String(ganancia)]);
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
    <section className="historial-wrap">
      <div className="print-header">
        <div className="print-marca">The Club Housse</div>
        <div className="print-subtitulo">Reporte del día {fecha}</div>
      </div>

      <div className="historial-toolbar no-print">
        <label>
          Día: <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <button className="tab-btn" onClick={descargarCsv}>
          ⬇️ Descargar CSV
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
                  <td>
                    <button className="btn-confirmar-mini" onClick={() => confirmarDesdeHistorial(p.id)}>
                      ✅ Confirmar pago
                    </button>
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
