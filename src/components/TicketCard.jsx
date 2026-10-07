import { formatoCOP, formatoHora, TIPO_ENTREGA_LABEL, PAGO_LABEL, numeroPedido } from '../lib/format';
import ComprobantePago from './ComprobantePago';
import { imprimirTicket } from '../lib/print';

export default function TicketCard({ order, onDelete, onConfirmarPago, onActualizado }) {
  // Los pedidos anteriores a esta función no traen la marca: cuentan como pagados.
  const pagado = order.pagoConfirmado !== false;
  return (
    <article className="ticket">
      <div className="ticket-header">
        <span>{order.consecutivo ? 'N.º ' : '#'}{numeroPedido(order)}</span>
        <span>{formatoHora(order.createdAt)}</span>
      </div>
      <div className="ticket-client">
        <span className="ticket-tipo-entrega">{TIPO_ENTREGA_LABEL[order.tipoEntrega] || order.tipoEntrega || ''}</span>
        <strong>{order.cliente?.nombre || 'Sin nombre'}</strong>
        <span>{order.cliente?.telefono || ''}</span>
        {order.cliente?.direccion && <span>{order.cliente.direccion}</span>}
        {order.cliente?.nota && <span className="ticket-nota">Nota: {order.cliente.nota}</span>}
      </div>
      <ul className="ticket-items">
        {(order.items || []).map((it, i) => (
          <li key={i}>
            {it.cantidad} x {it.name}
            {(it.adiciones || []).map((a, j) => (
              <div key={j} className="ticket-adicion">
                + {a.name}
              </div>
            ))}
            {it.salsas?.length > 0 && <div className="ticket-adicion">Salsas: {it.salsas.join(', ')}</div>}
          </li>
        ))}
      </ul>
      {order.cargoDomicilio > 0 && (
        <div className="ticket-domicilio">
          Domicilio: {formatoCOP(order.cargoDomicilio)}
          {order.envio?.distanciaKm ? ` · ${String(order.envio.distanciaKm).replace('.', ',')} km` : ''}
          {order.envio?.barrio ? ` · ${order.envio.barrio}` : ''}
        </div>
      )}
      <div className="ticket-total">Total: {formatoCOP(order.total)}</div>
      <div className={`ticket-metodo metodo-${order.metodoPago || 'efectivo'}`}>Pago: {PAGO_LABEL[order.metodoPago] || order.metodoPago || 'Efectivo'}</div>
      <ComprobantePago order={order} onActualizado={onActualizado} />
      <div className="ticket-actions">
        <button className="btn-print" onClick={() => imprimirTicket(order)}>
          🖨️ Imprimir
        </button>
        <button className="btn-delete" onClick={() => onDelete(order)}>
          📦 Despachar
        </button>
        {pagado ? (
          <div className="pago-confirmado">✔ Pago confirmado</div>
        ) : (
          <button className="btn-confirmar" onClick={() => onConfirmarPago(order.id)}>
            ✅ Confirmar pago
          </button>
        )}
      </div>
    </article>
  );
}
