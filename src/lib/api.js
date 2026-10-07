// Mismo backend PHP de siempre (proxies hacia el sitio del restaurante), sin
// tocarlo: solo cambia quién lo consume.

export async function fetchOrders() {
  const res = await fetch('api/proxy-orders.php');
  return res.json();
}

export async function deleteOrder(id) {
  const res = await fetch('api/proxy-delete.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function confirmarPago(id) {
  const res = await fetch('api/proxy-confirmar-pago.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function eliminarPedido(id) {
  const res = await fetch('api/proxy-eliminar-pedido.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function reiniciarSistema(confirmacion) {
  const res = await fetch('api/proxy-reiniciar.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmacion }),
  });
  return res.json();
}

export async function subirComprobante(orderId, foto) {
  const f = new FormData();
  f.append('orderId', String(orderId));
  f.append('comprobante', foto, 'comprobante.jpg');
  const res = await fetch('api/proxy-subir-comprobante.php', { method: 'POST', body: f });
  try {
    return await res.json();
  } catch {
    return { success: false, error: 'No se pudo guardar el comprobante.' };
  }
}

export async function fetchHistorial() {
  const res = await fetch('api/proxy-historial.php');
  return res.json();
}

export async function verifyGoogleLogin(idToken) {
  const res = await fetch('api/verify-google.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  return res.json();
}

export async function fetchSession() {
  const res = await fetch('api/me.php', { cache: 'no-store' });
  return res.json();
}

export async function logoutSession() {
  const res = await fetch('api/logout.php', { method: 'POST' });
  return res.json();
}

export async function getPublicConfig() {
  const res = await fetch('api/public-config.php');
  return res.json();
}

export async function usuariosApi(body) {
  const res = await fetch('api/usuarios.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function gastosApi(body) {
  const res = await fetch('api/gastos.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
