// Reporte de ventas en Excel (.xlsx) con la marca del restaurante: hojas
// separadas (Resumen, Pedidos, Pendientes de pago, Gastos, Productos), colores,
// totales con fórmulas, montos en pesos y fechas reales (se pueden filtrar y
// ordenar). Reemplaza al CSV plano de antes. La librería (exceljs) pesa
// bastante, así que solo se descarga cuando alguien pulsa "Descargar".
import { formatoFechaISO, CANAL_LABEL, PAGO_LABEL } from './format.js';

const TZ = 'America/Bogota';
const C = {
  oscuro: 'FF1F1410',
  oscuro2: 'FF2A1C15',
  naranja: 'FFFF7A1A',
  naranjaSuave: 'FFFFF2E2',
  crema: 'FFFFF8EF',
  borde: 'FFF0DCC5',
  gris: 'FF8A7A6A',
  verde: 'FF1A7A3D',
  rojo: 'FFD33A2C',
  blanco: 'FFFFFFFF',
};
const FMT_PESOS = '"$" #,##0';
const FMT_FECHA = 'dd/mm/yyyy';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ENTREGA = { domicilio: 'A domicilio', recoger: 'Para recoger', comer_aqui: 'Comer aquí' };

const hora24 = (ms) => new Date(ms).toLocaleTimeString('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
// Fecha "YYYY-MM-DD" -> Date a medianoche UTC (Excel la guarda como fecha sin hora).
const aFecha = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmtLarga = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};
const diaSemana = (iso) => DIAS[aFecha(iso).getUTCDay()];

function diasEntre(desde, hasta) {
  const out = [];
  const fin = aFecha(hasta).getTime();
  for (let t = aFecha(desde).getTime(); t <= fin; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function rangoDelMes(fechaISO) {
  const [y, m] = fechaISO.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate(); // día 0 del mes siguiente = último de este
  const mm = String(m).padStart(2, '0');
  return { desde: `${y}-${mm}-01`, hasta: `${y}-${mm}-${String(ultimo).padStart(2, '0')}`, ultimo, nombre: `${MESES[m - 1]} ${y}` };
}

export function nombreArchivo(desde, hasta) {
  return desde === hasta ? `Club-Housse-ventas-${desde}.xlsx` : `Club-Housse-ventas-${desde}_a_${hasta}.xlsx`;
}

const estadoPago = (p) => {
  if (p.pagoConfirmado === false) return 'Pendiente';
  if (p.pagoConfirmadoAt) return `Confirmado ${hora24(p.pagoConfirmadoAt)}`;
  return 'Confirmado (anterior al control de pagos)';
};

const lineaBorde = { style: 'thin', color: { argb: C.borde } };
const bordes = { top: lineaBorde, left: lineaBorde, bottom: lineaBorde, right: lineaBorde };

function titulo(ws, texto, sub, hastaCol) {
  ws.mergeCells(1, 1, 1, hastaCol);
  ws.mergeCells(2, 1, 2, hastaCol);
  const t = ws.getCell(1, 1);
  t.value = texto;
  t.font = { name: 'Calibri', size: 20, bold: true, color: { argb: C.naranja } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.oscuro } };
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { name: 'Calibri', size: 11, color: { argb: C.crema } };
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.oscuro2 } };
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 34;
  ws.getRow(2).height = 22;
  for (let c = 2; c <= hastaCol; c++) {
    ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.oscuro } };
    ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.oscuro2 } };
  }
}

function encabezado(row, textos) {
  textos.forEach((txt, i) => {
    const cell = row.getCell(i + 1);
    cell.value = txt;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.blanco } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.oscuro2 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = bordes;
  });
  row.height = 24;
}

function estiloFila(row, n, { zebra = true } = {}) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = bordes;
    cell.font = { name: 'Calibri', size: 11, ...(cell.font || {}) };
    cell.alignment = { vertical: 'middle', ...(cell.alignment || {}) };
    if (zebra && n % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.crema } };
  });
}

function filaTotal(row, desdeCol, hastaCol) {
  for (let c = desdeCol; c <= hastaCol; c++) {
    const cell = row.getCell(c);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.oscuro } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaSuave } };
    cell.border = { top: { style: 'medium', color: { argb: C.naranja } }, bottom: lineaBorde, left: lineaBorde, right: lineaBorde };
  }
  row.height = 22;
}

function seccion(ws, fila, texto, hastaCol) {
  ws.mergeCells(fila, 1, fila, hastaCol);
  const c = ws.getCell(fila, 1);
  c.value = texto;
  c.font = { name: 'Calibri', size: 13, bold: true, color: { argb: C.oscuro } };
  c.border = { bottom: { style: 'medium', color: { argb: C.naranja } } };
  c.alignment = { vertical: 'middle' };
  ws.getRow(fila).height = 24;
}

export async function generarReporteExcel({ pedidos, gastos, desde, hasta }) {
  const mod = await import('exceljs');
  const ExcelJS = mod.default || mod;

  const dentro = (ms) => {
    const f = formatoFechaISO(ms);
    return f >= desde && f <= hasta;
  };
  const todos = pedidos.filter((p) => dentro(p.createdAt)).sort((a, b) => a.createdAt - b.createdAt);
  const ventas = todos.filter((p) => p.pagoConfirmado !== false);
  const pendientes = todos.filter((p) => p.pagoConfirmado === false);
  const gastosPeriodo = gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (a.creadoEn || 0) - (b.creadoEn || 0)));

  const totalVentas = ventas.reduce((a, p) => a + (p.total || 0), 0);
  const totalGastos = gastosPeriodo.reduce((a, g) => a + (g.monto || 0), 0);
  const ganancia = totalVentas - totalGastos;
  const esDia = desde === hasta;
  const mes = rangoDelMes(desde);
  const esMesCompleto = desde === mes.desde && hasta === mes.hasta;
  const periodoTxt = esDia
    ? `${diaSemana(desde)} ${fmtLarga(desde)}`
    : esMesCompleto
      ? `${mes.nombre[0].toUpperCase()}${mes.nombre.slice(1)} (del 1 al ${mes.ultimo})`
      : `${fmtLarga(desde)} al ${fmtLarga(hasta)}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'The Club Housse';
  wb.created = new Date();
  wb.title = `Reporte de ventas - ${periodoTxt}`;

  // ───────────────────────── Resumen ─────────────────────────
  const rs = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }], properties: { tabColor: { argb: C.naranja } } });
  rs.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
  titulo(rs, 'THE CLUB HOUSSE', `Reporte de ventas · ${periodoTxt}`, 6);

  // Tarjetas de totales
  const kpis = [
    ['Ventas confirmadas', totalVentas, FMT_PESOS, C.verde],
    ['Pedidos', ventas.length, '#,##0', C.oscuro],
    ['Ticket promedio', ventas.length ? Math.round(totalVentas / ventas.length) : 0, FMT_PESOS, C.oscuro],
    ['Gastos', totalGastos, FMT_PESOS, C.rojo],
    ['Ganancia', ganancia, FMT_PESOS, ganancia >= 0 ? C.verde : C.rojo],
  ];
  kpis.forEach(([label, valor, fmt, color], i) => {
    const l = rs.getCell(4, i + 1);
    l.value = label;
    l.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.gris } };
    l.alignment = { horizontal: 'center', vertical: 'middle' };
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaSuave } };
    l.border = { top: lineaBorde, left: lineaBorde, right: lineaBorde };
    const v = rs.getCell(5, i + 1);
    v.value = valor;
    v.numFmt = fmt;
    v.font = { name: 'Calibri', size: 16, bold: true, color: { argb: color } };
    v.alignment = { horizontal: 'center', vertical: 'middle' };
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.naranjaSuave } };
    v.border = { bottom: lineaBorde, left: lineaBorde, right: lineaBorde };
  });
  rs.getRow(4).height = 20;
  rs.getRow(5).height = 32;
  if (pendientes.length) {
    rs.mergeCells(6, 1, 6, 6);
    const n = rs.getCell(6, 1);
    n.value = `⚠ Hay ${pendientes.length} pedido(s) con el pago sin confirmar por ${pendientes.reduce((a, p) => a + (p.total || 0), 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}. No cuentan como venta (ver hoja "Pendientes de pago").`;
    n.font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.rojo } };
  }

  let fila = 8;
  if (!esDia) {
    seccion(rs, fila, 'Ventas por día', 6);
    fila++;
    encabezado(rs.getRow(fila), ['Fecha', 'Día', 'Pedidos', 'Ventas', 'Gastos', 'Ganancia']);
    const ini = fila + 1;
    const porDia = new Map();
    for (const p of ventas) {
      const f = formatoFechaISO(p.createdAt);
      const x = porDia.get(f) || { n: 0, v: 0 };
      x.n++;
      x.v += p.total || 0;
      porDia.set(f, x);
    }
    const gPorDia = new Map();
    for (const g of gastosPeriodo) gPorDia.set(g.fecha, (gPorDia.get(g.fecha) || 0) + (g.monto || 0));
    diasEntre(desde, hasta).forEach((f, i) => {
      fila++;
      const x = porDia.get(f) || { n: 0, v: 0 };
      const r = rs.getRow(fila);
      r.getCell(1).value = aFecha(f);
      r.getCell(1).numFmt = FMT_FECHA;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = diaSemana(f);
      r.getCell(3).value = x.n;
      r.getCell(4).value = x.v;
      r.getCell(5).value = gPorDia.get(f) || 0;
      r.getCell(6).value = { formula: `D${fila}-E${fila}`, result: x.v - (gPorDia.get(f) || 0) };
      [4, 5, 6].forEach((c) => (r.getCell(c).numFmt = FMT_PESOS));
      r.getCell(3).alignment = { horizontal: 'center' };
      estiloFila(r, i);
    });
    fila++;
    const tr = rs.getRow(fila);
    tr.getCell(1).value = 'TOTAL';
    tr.getCell(3).value = { formula: `SUM(C${ini}:C${fila - 1})`, result: ventas.length };
    tr.getCell(4).value = { formula: `SUM(D${ini}:D${fila - 1})`, result: totalVentas };
    tr.getCell(5).value = { formula: `SUM(E${ini}:E${fila - 1})`, result: totalGastos };
    tr.getCell(6).value = { formula: `SUM(F${ini}:F${fila - 1})`, result: ganancia };
    [4, 5, 6].forEach((c) => (tr.getCell(c).numFmt = FMT_PESOS));
    tr.getCell(3).alignment = { horizontal: 'center' };
    filaTotal(tr, 1, 6);
    fila += 2;
  }

  const desglose = (tituloSec, etiqueta, clave, mapa) => {
    seccion(rs, fila, tituloSec, 6);
    fila++;
    encabezado(rs.getRow(fila), [etiqueta, 'Pedidos', 'Ventas', '% de ventas']);
    const m = new Map();
    for (const p of ventas) {
      const k = mapa(p) || 'Otro';
      const x = m.get(k) || { n: 0, v: 0 };
      x.n++;
      x.v += p.total || 0;
      m.set(k, x);
    }
    const lista = [...m.entries()].sort((a, b) => b[1].v - a[1].v);
    if (!lista.length) {
      fila++;
      rs.getCell(fila, 1).value = 'Sin datos en este periodo';
      rs.getCell(fila, 1).font = { italic: true, color: { argb: C.gris } };
    }
    lista.forEach(([k, x], i) => {
      fila++;
      const r = rs.getRow(fila);
      r.getCell(1).value = k;
      r.getCell(2).value = x.n;
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).value = x.v;
      r.getCell(3).numFmt = FMT_PESOS;
      r.getCell(4).value = totalVentas ? x.v / totalVentas : 0;
      r.getCell(4).numFmt = '0.0%';
      r.getCell(4).alignment = { horizontal: 'center' };
      estiloFila(r, i);
    });
    fila += 2;
  };
  desglose('Por método de pago', 'Método', 'metodoPago', (p) => PAGO_LABEL[p.metodoPago] || p.metodoPago);
  desglose('Por canal de venta', 'Canal', 'canal', (p) => CANAL_LABEL[p.canal] || p.canal);
  desglose('Por tipo de entrega', 'Entrega', 'tipoEntrega', (p) => ENTREGA[p.tipoEntrega] || p.tipoEntrega);

  // ───────────────────────── Pedidos ─────────────────────────
  const armarHojaPedidos = (nombre, lista, tabColor, conTotal) => {
    const ws = wb.addWorksheet(nombre, { properties: { tabColor: { argb: tabColor } }, views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
    const cols = [
      ['Fecha', 12], ['Hora', 8], ['N.º pedido', 11], ['Cliente', 24], ['Teléfono', 14], ['Entrega', 15],
      ['Canal', 20], ['Pago', 11], ['Productos', 44], ['Total', 14], ['Estado del pago', 26], ['Confirmado por', 26], ['Despachado', 12],
    ];
    ws.columns = cols.map(([, w]) => ({ width: w }));
    titulo(ws, 'THE CLUB HOUSSE', `${nombre} · ${periodoTxt}`, cols.length);
    encabezado(ws.getRow(4), cols.map(([t]) => t));
    lista.forEach((p, i) => {
      const r = ws.getRow(5 + i);
      const f = formatoFechaISO(p.createdAt);
      r.getCell(1).value = aFecha(f);
      r.getCell(1).numFmt = FMT_FECHA;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = hora24(p.createdAt);
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).value = String(p.id).slice(-6);
      r.getCell(3).alignment = { horizontal: 'center' };
      r.getCell(4).value = p.cliente?.nombre || '';
      r.getCell(5).value = p.cliente?.telefono || '';
      r.getCell(6).value = ENTREGA[p.tipoEntrega] || p.tipoEntrega || '';
      r.getCell(7).value = CANAL_LABEL[p.canal] || p.canal || '';
      r.getCell(8).value = PAGO_LABEL[p.metodoPago] || p.metodoPago || '';
      r.getCell(9).value = (p.items || []).map((it) => `${it.cantidad} × ${it.name}${it.adiciones?.length ? ` (${it.adiciones.map((a) => `+ ${a.name}`).join(', ')})` : ''}${it.salsas?.length ? ` [Salsas: ${it.salsas.join(', ')}]` : ''}`).join('\n');
      r.getCell(9).alignment = { wrapText: true, vertical: 'middle' };
      r.getCell(10).value = p.total || 0;
      r.getCell(10).numFmt = FMT_PESOS;
      r.getCell(11).value = estadoPago(p);
      r.getCell(12).value = p.pagoConfirmadoPor || '';
      r.getCell(13).value = p.despachadoAt ? hora24(p.despachadoAt) : '—';
      r.getCell(13).alignment = { horizontal: 'center' };
      estiloFila(r, i);
      r.getCell(11).font = { name: 'Calibri', size: 11, bold: true, color: { argb: p.pagoConfirmado === false ? C.rojo : C.verde } };
      r.getCell(9).alignment = { wrapText: true, vertical: 'middle' };
      const lineas = Math.max(1, (p.items || []).length);
      r.height = Math.max(20, 15 * lineas + 4);
    });
    const ultima = 4 + lista.length;
    if (lista.length) {
      ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: ultima, column: cols.length } };
    } else {
      ws.mergeCells(5, 1, 5, cols.length);
      ws.getCell(5, 1).value = 'No hay pedidos en este periodo.';
      ws.getCell(5, 1).font = { italic: true, color: { argb: C.gris } };
    }
    if (conTotal && lista.length) {
      const tr = ws.getRow(ultima + 1);
      tr.getCell(9).value = 'TOTAL';
      tr.getCell(9).alignment = { horizontal: 'right' };
      tr.getCell(10).value = { formula: `SUBTOTAL(109,J5:J${ultima})`, result: lista.reduce((a, p) => a + (p.total || 0), 0) };
      tr.getCell(10).numFmt = FMT_PESOS;
      filaTotal(tr, 1, cols.length);
    }
  };
  armarHojaPedidos('Pedidos', ventas, C.verde, true);
  if (pendientes.length) armarHojaPedidos('Pendientes de pago', pendientes, C.rojo, false);

  // ───────────────────────── Gastos ─────────────────────────
  const wg = wb.addWorksheet('Gastos', { properties: { tabColor: { argb: C.rojo } }, views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  wg.columns = [{ width: 14 }, { width: 46 }, { width: 16 }];
  titulo(wg, 'THE CLUB HOUSSE', `Gastos y compras · ${periodoTxt}`, 3);
  encabezado(wg.getRow(4), ['Fecha', 'Descripción', 'Monto']);
  gastosPeriodo.forEach((g, i) => {
    const r = wg.getRow(5 + i);
    r.getCell(1).value = aFecha(g.fecha);
    r.getCell(1).numFmt = FMT_FECHA;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).value = g.descripcion || '';
    r.getCell(3).value = g.monto || 0;
    r.getCell(3).numFmt = FMT_PESOS;
    estiloFila(r, i);
  });
  if (gastosPeriodo.length) {
    const ult = 4 + gastosPeriodo.length;
    const tr = wg.getRow(ult + 1);
    tr.getCell(2).value = 'TOTAL';
    tr.getCell(2).alignment = { horizontal: 'right' };
    tr.getCell(3).value = { formula: `SUM(C5:C${ult})`, result: totalGastos };
    tr.getCell(3).numFmt = FMT_PESOS;
    filaTotal(tr, 1, 3);
  } else {
    wg.mergeCells(5, 1, 5, 3);
    wg.getCell(5, 1).value = 'No hay gastos registrados en este periodo.';
    wg.getCell(5, 1).font = { italic: true, color: { argb: C.gris } };
  }

  // ───────────────────────── Productos ─────────────────────────
  const prod = new Map();
  for (const p of ventas) {
    for (const it of p.items || []) {
      const x = prod.get(it.name) || { u: 0, ing: 0 };
      x.u += it.cantidad || 0;
      x.ing += (it.precioUnitario || 0) * (it.cantidad || 0);
      prod.set(it.name, x);
    }
  }
  const listaProd = [...prod.entries()].sort((a, b) => b[1].u - a[1].u || b[1].ing - a[1].ing);
  const wp = wb.addWorksheet('Productos', { properties: { tabColor: { argb: C.naranja } }, views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] });
  wp.columns = [{ width: 6 }, { width: 40 }, { width: 14 }, { width: 18 }];
  titulo(wp, 'THE CLUB HOUSSE', `Productos vendidos · ${periodoTxt}`, 4);
  encabezado(wp.getRow(4), ['#', 'Producto', 'Unidades', 'Ingresos']);
  listaProd.forEach(([nombre, x], i) => {
    const r = wp.getRow(5 + i);
    r.getCell(1).value = i + 1;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).value = nombre;
    r.getCell(3).value = x.u;
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).value = x.ing;
    r.getCell(4).numFmt = FMT_PESOS;
    estiloFila(r, i);
  });
  if (listaProd.length) {
    const ult = 4 + listaProd.length;
    const tr = wp.getRow(ult + 1);
    tr.getCell(2).value = 'TOTAL';
    tr.getCell(2).alignment = { horizontal: 'right' };
    tr.getCell(3).value = { formula: `SUM(C5:C${ult})`, result: listaProd.reduce((a, [, x]) => a + x.u, 0) };
    tr.getCell(3).alignment = { horizontal: 'center' };
    tr.getCell(4).value = { formula: `SUM(D5:D${ult})`, result: listaProd.reduce((a, [, x]) => a + x.ing, 0) };
    tr.getCell(4).numFmt = FMT_PESOS;
    filaTotal(tr, 1, 4);
  } else {
    wp.mergeCells(5, 1, 5, 4);
    wp.getCell(5, 1).value = 'No hay ventas en este periodo.';
    wp.getCell(5, 1).font = { italic: true, color: { argb: C.gris } };
  }

  // Impresión: horizontal, ajustada al ancho de la hoja.
  wb.eachSheet((ws) => {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
