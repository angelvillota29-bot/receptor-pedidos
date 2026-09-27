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

export async function fetchHistorial() {
  const res = await fetch('api/proxy-historial.php');
  return res.json();
}

export async function fetchSiteUsers() {
  const res = await fetch('api/proxy-users.php');
  return res.json();
}

export async function ownLogin(email, password) {
  const res = await fetch('api/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

const ADMIN_PASSWORD = '1234';

export async function usuariosApi(body) {
  const res = await fetch('api/usuarios.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword: ADMIN_PASSWORD, ...body }),
  });
  return res.json();
}
