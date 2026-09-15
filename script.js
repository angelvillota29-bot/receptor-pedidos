const REFRESH_MS = 20000;
let ordersData = [];

function formatoCOP(n) {
  return `$ ${Math.round(n || 0).toLocaleString('es-CO')}`;
}

function formatoHora(ms) {
  const d = new Date(ms);
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function cargarPedidos() {
  try {
    const res = await fetch('api/proxy-orders.php');
    const data = await res.json();
    if (!data.success) {
      if (data.error === 'no_configurado') {
        document.getElementById('config-warning').classList.remove('hidden');
      }
      return;
    }
    document.getElementById('config-warning').classList.add('hidden');
    ordersData = data.orders || [];
    renderPedidos();
    document.getElementById('last-update').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    console.error('Error cargando pedidos:', e);
  }
}

function renderPedidos() {
  const grid = document.getElementById('orders-grid');
  const emptyMsg = document.getElementById('empty-msg');
  if (ordersData.length === 0) {
    grid.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');
  grid.innerHTML = ordersData.map(o => {
    const itemsHtml = (o.items || []).map(it => {
      const prefix = it.tipo === 'acompanamiento' ? '+ ' : '';
      return `<li>${it.cantidad} x ${prefix}${it.name}</li>`;
    }).join('');
    return `<article class="ticket" data-id="${o.id}">
      <div class="ticket-header">
        <span class="ticket-id">#${String(o.id).slice(-6)}</span>
        <span class="ticket-time">${formatoHora(o.createdAt)}</span>
      </div>
      <div class="ticket-client">
        <strong>${escapeHtml(o.cliente?.nombre || 'Sin nombre')}</strong>
        <span>${escapeHtml(o.cliente?.telefono || '')}</span>
        <span>${escapeHtml(o.cliente?.direccion || '')}</span>
        ${o.cliente?.nota ? `<span class="ticket-nota">Nota: ${escapeHtml(o.cliente.nota)}</span>` : ''}
      </div>
      <ul class="ticket-items">${itemsHtml}</ul>
      <div class="ticket-total">Total: ${formatoCOP(o.total)}</div>
      <div class="ticket-actions">
        <button class="btn-print" onclick="imprimirTicket(${JSON.stringify(o.id)})">🖨️ Imprimir</button>
        <button class="btn-delete" onclick="eliminarTicket(${JSON.stringify(o.id)})">🗑️ Eliminar</button>
      </div>
    </article>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.imprimirTicket = (id) => {
  const o = ordersData.find(x => x.id == id);
  if (!o) return;
  const itemsHtml = (o.items || []).map(it => {
    const prefix = it.tipo === 'acompanamiento' ? '+ ' : '';
    return `<div>${it.cantidad} x ${prefix}${it.name}</div>`;
  }).join('');
  const win = window.open('', '_blank', 'width=380,height=600');
  win.document.write(`<!DOCTYPE html><html><head><title>Ticket #${o.id}</title>
    <meta name="color-scheme" content="light">
    <style>
      html,body{background:#fff !important;}
      body{font-family:monospace;font-size:14px;padding:12px;color:#000;}
      h2{margin:0 0 4px;font-size:16px;color:#000;}
      .linea{border-top:1px dashed #000;margin:8px 0;}
      .total{font-weight:bold;font-size:16px;margin-top:8px;}
      .btn-cerrar{margin-top:16px;width:100%;padding:8px;font-size:14px;cursor:pointer;}
      @media print { .btn-cerrar{ display:none; } }
    </style></head><body>
    <h2>Pedido #${o.id}</h2>
    <div>${formatoHora(o.createdAt)}</div>
    <div class="linea"></div>
    <div><strong>${escapeHtml(o.cliente?.nombre || '')}</strong></div>
    <div>${escapeHtml(o.cliente?.telefono || '')}</div>
    <div>${escapeHtml(o.cliente?.direccion || '')}</div>
    ${o.cliente?.nota ? `<div>Nota: ${escapeHtml(o.cliente.nota)}</div>` : ''}
    <div class="linea"></div>
    ${itemsHtml}
    <div class="linea"></div>
    <div class="total">Total: ${formatoCOP(o.total)}</div>
    <button class="btn-cerrar" onclick="window.close()">Cerrar esta ventana</button>
    </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 150);
};

window.eliminarTicket = async (id) => {
  if (!confirm('¿Eliminar este ticket? Ya no se podrá recuperar.')) return;
  try {
    const res = await fetch('api/proxy-delete.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.success) {
      ordersData = ordersData.filter(o => o.id != id);
      renderPedidos();
    } else {
      alert('No se pudo eliminar: ' + (data.error || 'error desconocido'));
    }
  } catch (e) {
    alert('No se pudo eliminar el ticket, intenta de nuevo.');
  }
};

document.getElementById('refresh-btn').addEventListener('click', cargarPedidos);
cargarPedidos();
setInterval(cargarPedidos, REFRESH_MS);
