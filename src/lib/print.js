import { formatoCOP, formatoHora, TIPO_ENTREGA_LABEL } from './format';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function imprimirTicket(o) {
  const itemsHtml = (o.items || []).map((it) => `<div>${it.cantidad} x ${escapeHtml(it.name)}</div>`).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Ticket #${o.id}</title>
    <meta name="color-scheme" content="light">
    <style>
      @page { size: auto; margin: 6mm; }
      html,body{background:#fff !important; height:auto !important; margin:0;}
      body{font-family:monospace;font-size:14px;padding:12px;color:#000;}
      h2{margin:0 0 4px;font-size:16px;color:#000;}
      .linea{border-top:1px dashed #000;margin:8px 0;}
      .total{font-weight:bold;font-size:16px;margin-top:8px;}
      .btn-cerrar{margin-top:16px;width:100%;padding:8px;font-size:14px;cursor:pointer;}
      @media print { .btn-cerrar{ display:none; } }
    </style></head><body>
    <h2>Pedido #${o.id}</h2>
    <div>${formatoHora(o.createdAt)}</div>
    <div><strong>${escapeHtml(TIPO_ENTREGA_LABEL[o.tipoEntrega] || o.tipoEntrega || '')}</strong></div>
    <div class="linea"></div>
    <div><strong>${escapeHtml(o.cliente?.nombre || '')}</strong></div>
    <div>${escapeHtml(o.cliente?.telefono || '')}</div>
    ${o.cliente?.direccion ? `<div>${escapeHtml(o.cliente.direccion)}</div>` : ''}
    ${o.cliente?.nota ? `<div>Nota: ${escapeHtml(o.cliente.nota)}</div>` : ''}
    <div class="linea"></div>
    ${itemsHtml}
    <div class="linea"></div>
    <div class="total">Total: ${formatoCOP(o.total)}</div>
    <button class="btn-cerrar" onclick="window.close()">Cerrar esta ventana</button>
    </body></html>`);
  win.document.close();
  win.focus();
  win.onafterprint = () => {
    try {
      win.close();
    } catch {
      /* ya se cerró */
    }
  };
  setTimeout(() => win.print(), 150);
}
