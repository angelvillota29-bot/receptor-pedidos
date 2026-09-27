import { formatoCOP, formatoHora, TIPO_ENTREGA_LABEL } from '../lib/format';
import { imprimirTicket } from '../lib/print';

export default function TicketCard({ order, onDelete }) {
  return (
    <article className="ticket">
      <div className="ticket-header">
        <span>#{String(order.id).slice(-6)}</span>
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
          </li>
        ))}
      </ul>
      <div className="ticket-total">Total: {formatoCOP(order.total)}</div>
      <div className="ticket-actions">
        <button className="btn-print" onClick={() => imprimirTicket(order)}>
          🖨️ Imprimir
        </button>
        <button className="btn-delete" onClick={() => onDelete(order.id)}>
          🗑️ Eliminar
        </button>
      </div>
    </article>
  );
}
