const TZ = 'America/Bogota';

export function formatoCOP(n) {
  return `$ ${Math.round(n || 0).toLocaleString('es-CO')}`;
}

export function formatoHora(ms) {
  return new Date(ms).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatoHoraCorta(ms) {
  return new Date(ms).toLocaleString('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
}

export function formatoFechaISO(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
}

export function hoyISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

export const CANAL_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', chat_web: 'Chat del sitio', pagina: 'Carrito de la página' };
export const TIPO_ENTREGA_LABEL = { domicilio: '🛵 A domicilio', recoger: '🏪 Para recoger', comer_aqui: '🍽️ Comer aquí' };
export const PAGO_LABEL = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata' };

// Número de recibo (consecutivo) con ceros: 7 -> "0007". Los pedidos anteriores
// a esta función no lo tienen: se muestra el final de su código de siempre.
export function numeroPedido(o) {
  const n = Number(o?.consecutivo);
  return Number.isFinite(n) && n > 0 ? String(n).padStart(4, '0') : String(o?.id ?? '').slice(-6);
}

export function horaDelDia(ms) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(ms));
}

export function diaDeSemana(ms) {
  return new Date(ms).toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long' });
}

export function fechaISOHaceDias(dias) {
  return formatoFechaISO(Date.now() - dias * 86400000);
}
