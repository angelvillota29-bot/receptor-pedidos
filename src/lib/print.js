import { formatoCOP, formatoHora, TIPO_ENTREGA_LABEL, PAGO_LABEL } from './format';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Ticket pensado para impresora térmica de 58mm (probado en DIG-C58):
// - Ancho de contenido de 48mm (no 58mm) alineado a la izquierda: el rollo
//   mide 58mm pero el cabezal solo imprime ~48mm empezando desde el borde
//   izquierdo -- usar los 58mm completos cortaba el último carácter de la
//   derecha (ej. el $55.000 salía como $55.00).
// - Como una térmica solo pinta en negro (no hay "color" posible), la
//   intensidad se logra con barras sólidas en negro + negrita, no con tonos.
export function imprimirTicket(o) {
  const itemsHtml = (o.items || [])
    .map(
      (it) => `<div class="item">
        <span class="item-nombre">${it.cantidad} x ${escapeHtml(it.name)}</span>
        <span class="item-precio">${formatoCOP(it.precioUnitario * it.cantidad)}</span>
      </div>`
    )
    .join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Ticket #${o.id}</title>
    <meta name="color-scheme" content="light">
    <style>
      @page { size: 58mm auto; margin: 0; }
      html,body{background:#fff !important; height:auto !important; margin:0;}
      body{
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color:#000;
        width: 48mm;
        margin: 0;
        box-sizing: border-box;
        padding: 3mm 1mm 6mm;
      }
      .marca-bar{
        background:#000; color:#fff;
        text-align:center; font-weight:800; font-size:16px;
        text-transform:uppercase; letter-spacing:0.5px;
        padding:2mm 0; margin-bottom:2mm;
      }
      .subtitulo{ text-align:center; font-size:10px; font-weight:700; margin-bottom:2mm; }
      .fila{ display:flex; justify-content:space-between; gap:4px; }
      .tipo-entrega{
        font-weight:800; font-size:14px; text-align:center;
        border:1.5px solid #000; border-radius:3px; padding:1.5mm 0; margin:2mm 0;
      }
      .linea{ border-top:2px solid #000; margin:2mm 0; }
      .cliente strong{ font-size:14px; font-weight:800; }
      .cliente div{ font-size:12px; font-weight:600; }
      .nota{ font-style:italic; font-weight:700; }
      .items{ margin-top:1mm; }
      .item{ display:flex; justify-content:space-between; gap:4px; font-size:12.5px; font-weight:600; padding:0.8mm 0; }
      .item-nombre{ flex:1; }
      .item-precio{ white-space:nowrap; font-weight:800; }
      .total-bar{
        background:#000; color:#fff; display:flex; justify-content:space-between;
        font-weight:800; font-size:16px; padding:2mm; margin-top:2mm; gap:4px;
      }
      .pago{ font-size:11.5px; font-weight:700; margin-top:2mm; text-align:center; }
      .gracias{ text-align:center; font-size:12px; font-weight:800; margin-top:3mm; }
      .btn-cerrar{ margin-top:5mm; width:100%; padding:8px; font-size:14px; cursor:pointer; }
      @media print { .btn-cerrar{ display:none; } }
    </style></head><body>
    <div class="marca-bar">The Club Housse</div>
    <div class="subtitulo">Pedido #${String(o.id).slice(-6)} &middot; ${formatoHora(o.createdAt)}</div>
    <div class="tipo-entrega">${escapeHtml(TIPO_ENTREGA_LABEL[o.tipoEntrega] || o.tipoEntrega || '')}</div>
    <div class="linea"></div>
    <div class="cliente">
      <div><strong>${escapeHtml(o.cliente?.nombre || 'Sin nombre')}</strong></div>
      ${o.cliente?.telefono ? `<div>Tel: ${escapeHtml(o.cliente.telefono)}</div>` : ''}
      ${o.cliente?.direccion ? `<div>${escapeHtml(o.cliente.direccion)}</div>` : ''}
      ${o.cliente?.nota ? `<div class="nota">Nota: ${escapeHtml(o.cliente.nota)}</div>` : ''}
    </div>
    <div class="linea"></div>
    <div class="items">${itemsHtml}</div>
    <div class="total-bar"><span>TOTAL</span><span>${formatoCOP(o.total)}</span></div>
    <div class="pago">Pago: ${escapeHtml(PAGO_LABEL[o.metodoPago] || o.metodoPago || '')}</div>
    <div class="gracias">¡Gracias por tu compra!</div>
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
