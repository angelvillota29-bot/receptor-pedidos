import { formatoCOP, formatoHora, PAGO_LABEL, numeroPedido } from './format';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Texto plano para el ticket térmico -- sin emoji (el cabezal de la térmica
// no los imprime bien, salen como cuadros/símbolos raros). El emoji sigue
// usándose en pantalla (TicketCard/format.js), esto es solo para imprimir.
const TIPO_ENTREGA_PLANO = { domicilio: 'A domicilio', recoger: 'Para recoger', comer_aqui: 'Comer aqui' };

// Imprime dentro de un iframe invisible de la MISMA página, en vez de abrir
// otra pestaña/ventana: antes quedaba una hoja blanca gigante con el ticket
// detrás del diálogo de impresión y había que cerrarla a mano. Aquí el panel
// sigue a la vista y solo aparece el diálogo de impresión.
function imprimirHtmlOculto(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);
  const quitar = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };
  const w = iframe.contentWindow;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onafterprint = () => setTimeout(quitar, 500);
  setTimeout(() => {
    w.focus();
    w.print();
  }, 150);
  // Respaldo por si el navegador nunca avisa que terminó de imprimir.
  setTimeout(quitar, 10 * 60 * 1000);
}

// Ticket pensado para impresora térmica (probado en DIG-C58): medido con
// regla por el dueño -- la hoja real mide 56mm (no 58mm) y el driver de
// Windows le mete 5mm de margen propios a cada lado por encima de lo que
// definamos aquí. Usamos 6mm (5mm medidos + 1mm de colchón) para que nunca
// vuelva a cortarse un dígito, dejando 44mm de ancho útil.
// Sin barras ni fondos rellenos: todo el texto es negro plano sobre blanco
// (una térmica no imprime "color", solo negrita/tamaño para dar énfasis).
export function imprimirTicket(o) {
  const itemsHtml = (o.items || [])
    .map(
      (it) => `<div class="item">
        <span class="item-nombre">${escapeHtml(it.cantidad)} x ${escapeHtml(it.name)}${(it.adiciones || [])
          .map((a) => `<span class="adic">+ ${escapeHtml(a.name)}</span>`)
          .join('')}${it.salsas?.length ? `<span class="adic">Salsas: ${escapeHtml(it.salsas.join(', '))}</span>` : ''}</span>
        <span class="item-precio">${formatoCOP(it.precioUnitario * it.cantidad)}</span>
      </div>`
    )
    .join('');
  imprimirHtmlOculto(`<!DOCTYPE html><html><head><title>Ticket #${escapeHtml(o.id)}</title>
    <meta name="color-scheme" content="light">
    <style>
      @page { size: 56mm auto; margin: 0; }
      html,body{background:#fff !important; height:auto !important; margin:0;}
      body{
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color:#000;
        width: 56mm;
        margin: 0;
        box-sizing: border-box;
        padding: 3mm 6mm 8mm 6mm;
      }
      .marca{ text-align:center; font-weight:800; font-size:15px; text-transform:uppercase; letter-spacing:0.5px; color:#000; }
      .subtitulo{ text-align:center; font-size:10px; font-weight:700; color:#000; margin-bottom:2mm; }
      .tipo-entrega{ font-weight:800; font-size:12.5px; text-align:center; border:1.5px solid #000; padding:1.5mm 0; margin:2mm 0; color:#000; }
      .linea{ border-top:1.5px solid #000; margin:2mm 0; }
      .cliente strong{ font-size:13px; font-weight:800; color:#000; }
      .cliente div{ font-size:12px; font-weight:600; color:#000; }
      .nota{ font-style:italic; }
      .items{ margin-top:1mm; }
      .item{ display:flex; align-items:flex-start; justify-content:space-between; gap:4px; font-size:12px; font-weight:600; color:#000; padding:0.8mm 0; }
      .item-nombre{ flex:1; }
      .adic{ display:block; font-size:11px; font-weight:700; padding-left:3mm; }
      .item-precio{ white-space:nowrap; font-weight:800; }
      .total{ display:flex; justify-content:space-between; font-weight:800; font-size:15px; color:#000; border-top:1.5px solid #000; padding-top:2mm; margin-top:2mm; }
      .pago{ font-size:11px; font-weight:700; color:#000; margin-top:2mm; text-align:center; }
      .gracias{ text-align:center; font-size:11px; font-weight:800; color:#000; margin-top:3mm; }
    </style></head><body>
    <div class="marca">The Club Housse</div>
    <div class="subtitulo">${o.consecutivo ? 'Recibo N.º ' : 'Pedido #'}${escapeHtml(numeroPedido(o))} &middot; ${formatoHora(o.createdAt)}</div>
    <div class="tipo-entrega">${escapeHtml(TIPO_ENTREGA_PLANO[o.tipoEntrega] || o.tipoEntrega || '')}</div>
    <div class="linea"></div>
    <div class="cliente">
      <div><strong>${escapeHtml(o.cliente?.nombre || 'Sin nombre')}</strong></div>
      ${o.cliente?.telefono ? `<div>Tel: ${escapeHtml(o.cliente.telefono)}</div>` : ''}
      ${o.cliente?.direccion ? `<div>${escapeHtml(o.cliente.direccion)}</div>` : ''}
      ${o.cliente?.nota ? `<div class="nota">Nota: ${escapeHtml(o.cliente.nota)}</div>` : ''}
    </div>
    <div class="linea"></div>
    <div class="items">${itemsHtml}</div>
    ${o.cargoDomicilio > 0 ? `<div class="item"><span class="item-nombre">Domicilio${o.envio?.barrio ? `<span class="adic">${escapeHtml(o.envio.barrio)}</span>` : ''}</span><span class="item-precio">${formatoCOP(o.cargoDomicilio)}</span></div>` : ''}
    <div class="total"><span>Total</span><span>${formatoCOP(o.total)}</span></div>
    <div class="pago">Pago: ${escapeHtml(PAGO_LABEL[o.metodoPago] || o.metodoPago || '')}</div>
    <div class="gracias">Gracias por tu compra</div>
    </body></html>`);
}
