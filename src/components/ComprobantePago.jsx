import { useRef, useState } from 'react';
import { subirComprobante } from '../lib/api';
import { prepararFoto } from '../lib/foto';
import { formatoHora } from '../lib/format';

// Comprobante de pago de un pedido por Nequi/Daviplata: se ve y se puede agregar
// otro (hasta 3), pero NUNCA se borra ni se reemplaza -- es la prueba del pago.
export default function ComprobantePago({ order, onActualizado }) {
  const input = useRef(null);
  const [ver, setVer] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  if (order.metodoPago !== 'nequi' && order.metodoPago !== 'daviplata') return null;

  const lista = Array.isArray(order.comprobantes) ? order.comprobantes : [];

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setSubiendo(true);
    try {
      const foto = await prepararFoto(archivo);
      const r = await subirComprobante(order.id, foto);
      if (!r.success) throw new Error(r.error || 'No se pudo guardar el comprobante.');
      onActualizado?.();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el comprobante.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="comprobante-box">
      {lista.length === 0 ? <span className="comprobante-falta">Sin comprobante</span> : null}
      {lista.map((c, i) => (
        <button key={i} type="button" className="comprobante-ver" onClick={() => setVer(i)}>
          🧾 Ver comprobante{lista.length > 1 ? ` ${i + 1}` : ''}
        </button>
      ))}
      {lista.length < 3 && (
        <>
          <input ref={input} type="file" accept="image/*" onChange={elegir} style={{ display: 'none' }} />
          <button type="button" className="comprobante-adjuntar" disabled={subiendo} onClick={() => input.current?.click()}>
            {subiendo ? 'Subiendo…' : lista.length ? '📎 Agregar otro' : '📎 Adjuntar'}
          </button>
        </>
      )}
      {ver !== null && lista[ver] && (
        <div className="comprobante-overlay no-print" onClick={() => setVer(null)}>
          <div className="comprobante-modal" onClick={(e) => e.stopPropagation()}>
            <img src={`api/proxy-comprobante.php?id=${order.id}&n=${lista[ver].n ?? ver}`} alt="Comprobante de pago" />
            <p>
              {order.consecutivo ? `Pedido N.º ${String(order.consecutivo).padStart(4, '0')} · ` : ''}
              {formatoHora(lista[ver].at)} · subido por {lista[ver].por === 'cliente' ? 'el cliente' : lista[ver].por}
            </p>
            <button type="button" className="tab-btn" onClick={() => setVer(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
