const REFRESH_MS = 20000;
const TZ = 'America/Bogota';
let ordersData = [];
let historialData = [];

function formatoCOP(n) {
  return `$ ${Math.round(n || 0).toLocaleString('es-CO')}`;
}

function formatoHora(ms) {
  const d = new Date(ms);
  return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatoHoraCorta(ms) {
  return new Date(ms).toLocaleString('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

// yyyy-mm-dd en la zona horaria del negocio, para agrupar/filtrar por día.
function formatoFechaISO(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
}

function hoyISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

const CANAL_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', chat_web: 'Chat del sitio', pagina: 'Carrito de la página' };
const PAGO_LABEL = { efectivo: 'Efectivo', nequi: 'Nequi' };

// ── Sesión (reusa el mismo usuario/contraseña del panel del sitio) ─────────
const SESSION_KEY = 'receptor_pedidos_sesion';

function getSesion() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

function setSesion(email) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ email })); } catch { /* modo privado: sigue sin recordar sesión */ }
}

function cerrarSesion() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  location.reload();
}

async function iniciarApp() {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('app-root').classList.remove('hidden');
  cargarPedidos();
  setInterval(cargarPedidos, REFRESH_MS);
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorMsg = document.getElementById('login-error-msg');
  errorMsg.textContent = '';
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch('api/proxy-users.php');
    const data = await res.json();
    if (!data.success) {
      errorMsg.textContent = data.error === 'no_configurado'
        ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY en este servicio.'
        : 'No se pudo verificar el usuario, intenta de nuevo.';
      return;
    }
    const users = data.users || [];
    const match = users.find((u) => (u.email || '').toLowerCase() === email && u.password === password);
    if (!match) {
      errorMsg.textContent = 'Correo o contraseña incorrectos.';
      return;
    }
    setSesion(email);
    iniciarApp();
  } catch (e) {
    errorMsg.textContent = 'No se pudo conectar con el servidor.';
  }
});

document.getElementById('logout-btn').addEventListener('click', cerrarSesion);

// ── Tabs ────────────────────────────────────────────────────────────────
document.getElementById('tab-pedidos-btn').addEventListener('click', () => cambiarTab('pedidos'));
document.getElementById('tab-historial-btn').addEventListener('click', () => cambiarTab('historial'));

function cambiarTab(tab) {
  document.getElementById('tab-pedidos').classList.toggle('hidden', tab !== 'pedidos');
  document.getElementById('tab-historial').classList.toggle('hidden', tab !== 'historial');
  document.getElementById('tab-pedidos-btn').classList.toggle('active', tab === 'pedidos');
  document.getElementById('tab-historial-btn').classList.toggle('active', tab === 'historial');
  if (tab === 'historial') cargarHistorial();
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

// ── Historial (registro permanente de ventas, con canal y método de pago) ──
async function cargarHistorial() {
  const tbody = document.getElementById('historial-tbody');
  const emptyMsg = document.getElementById('historial-empty-msg');
  try {
    const res = await fetch('api/proxy-historial.php');
    const data = await res.json();
    if (!data.success) {
      tbody.innerHTML = '';
      emptyMsg.textContent = data.error === 'no_configurado'
        ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY.'
        : 'No se pudo cargar el historial.';
      emptyMsg.classList.remove('hidden');
      return;
    }
    historialData = data.pedidos || [];
    renderHistorial();
  } catch (e) {
    console.error('Error cargando historial:', e);
  }
}

function renderHistorial() {
  const fecha = document.getElementById('historial-fecha').value || hoyISO();
  const delDia = historialData.filter((p) => formatoFechaISO(p.createdAt) === fecha);
  const tbody = document.getElementById('historial-tbody');
  const emptyMsg = document.getElementById('historial-empty-msg');
  const totalEl = document.getElementById('historial-total');
  const total = delDia.reduce((acc, p) => acc + (p.total || 0), 0);
  totalEl.textContent = `Total del día: ${formatoCOP(total)} (${delDia.length} pedido${delDia.length === 1 ? '' : 's'})`;
  if (delDia.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.classList.remove('hidden');
    return;
  }
  emptyMsg.classList.add('hidden');
  tbody.innerHTML = delDia.map((p) => `<tr>
    <td>${formatoHoraCorta(p.createdAt)}</td>
    <td>${escapeHtml(p.cliente?.nombre || '')}</td>
    <td>${CANAL_LABEL[p.canal] || p.canal || ''}</td>
    <td>${PAGO_LABEL[p.metodoPago] || p.metodoPago || ''}</td>
    <td>${formatoCOP(p.total)}</td>
  </tr>`).join('');
}

document.getElementById('historial-fecha').value = hoyISO();
document.getElementById('historial-fecha').addEventListener('change', renderHistorial);

document.getElementById('historial-imprimir-btn').addEventListener('click', () => window.print());

document.getElementById('historial-descargar-btn').addEventListener('click', () => {
  const fecha = document.getElementById('historial-fecha').value || hoyISO();
  const delDia = historialData.filter((p) => formatoFechaISO(p.createdAt) === fecha);
  const filas = [['Hora', 'Cliente', 'Telefono', 'Canal', 'Metodo de pago', 'Total']];
  for (const p of delDia) {
    filas.push([
      formatoHoraCorta(p.createdAt),
      p.cliente?.nombre || '',
      p.cliente?.telefono || '',
      CANAL_LABEL[p.canal] || p.canal || '',
      PAGO_LABEL[p.metodoPago] || p.metodoPago || '',
      String(p.total || 0),
    ]);
  }
  const total = delDia.reduce((acc, p) => acc + (p.total || 0), 0);
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
});

document.getElementById('refresh-btn').addEventListener('click', cargarPedidos);

const sesion = getSesion();
if (sesion) {
  iniciarApp();
} else {
  document.getElementById('login-overlay').classList.remove('hidden');
}
