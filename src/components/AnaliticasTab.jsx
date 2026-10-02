import { useEffect, useMemo, useState } from 'react';
import { fetchHistorial } from '../lib/api';
import {
  formatoCOP,
  formatoFechaISO,
  fechaISOHaceDias,
  horaDelDia,
  diaDeSemana,
  CANAL_LABEL,
  PAGO_LABEL,
  TIPO_ENTREGA_LABEL,
} from '../lib/format';

const RANGOS = [
  { key: 'hoy', label: 'Hoy', dias: 0 },
  { key: '7', label: '7 días', dias: 6 },
  { key: '30', label: '30 días', dias: 29 },
  { key: '90', label: '90 días', dias: 89 },
  { key: 'todo', label: 'Todo', dias: null },
];

function BarrasHorizontales({ filas, formato }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0) return <p className="analitica-vacio">Sin datos en este periodo.</p>;
  return (
    <ul className="barras-h">
      {filas.map((f) => (
        <li key={f.label}>
          <div className="barras-h-top">
            <span className="barras-h-label">{f.label}</span>
            <span className="barras-h-valor">{formato ? formato(f) : f.valor}</span>
          </div>
          <div className="barras-h-pista">
            <div className="barras-h-relleno" style={{ width: `${Math.max(2, (f.valor / max) * 100)}%`, background: f.color || undefined }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Columnas({ columnas, formato }) {
  const max = Math.max(1, ...columnas.map((c) => c.valor));
  return (
    <div className="columnas">
      {columnas.map((c) => (
        <div key={c.label} className="columna" title={`${c.titulo || c.label}: ${formato(c.valor)}`}>
          <div className="columna-barra-wrap">
            <div className="columna-barra" style={{ height: `${c.valor > 0 ? Math.max(3, (c.valor / max) * 100) : 0}%` }} />
          </div>
          <span className="columna-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

function Tarjeta({ titulo, children, ancha }) {
  return (
    <section className={`analitica-card ${ancha ? 'analitica-card-ancha' : ''}`}>
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}

function contar(pedidos, clave, etiquetas) {
  const m = new Map();
  for (const p of pedidos) {
    const k = clave(p) || 'otro';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()]
    .map(([k, valor]) => ({ label: etiquetas[k] || k, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export default function AnaliticasTab() {
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [rango, setRango] = useState('30');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchHistorial();
        if (!data.success) {
          setError(data.error === 'no_configurado' ? 'Falta configurar RESTAURANTE_API_URL/RESTAURANTE_API_KEY.' : 'No se pudo cargar la información.');
        } else {
          setPedidos(data.pedidos || []);
        }
      } catch {
        setError('No se pudo conectar con el servidor.');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const rangoActual = RANGOS.find((r) => r.key === rango);

  // Solo ventas con el pago confirmado (los pedidos viejos sin la marca cuentan).
  const delPeriodo = useMemo(() => {
    const confirmados = pedidos.filter((p) => p.pagoConfirmado !== false);
    if (rangoActual.dias === null) return confirmados;
    const desde = fechaISOHaceDias(rangoActual.dias);
    return confirmados.filter((p) => formatoFechaISO(p.createdAt) >= desde);
  }, [pedidos, rangoActual]);

  const stats = useMemo(() => {
    const totalVentas = delPeriodo.reduce((a, p) => a + (p.total || 0), 0);
    const productos = new Map();
    for (const p of delPeriodo) {
      for (const it of p.items || []) {
        const prev = productos.get(it.name) || { unidades: 0, ingresos: 0 };
        prev.unidades += it.cantidad || 0;
        prev.ingresos += (it.precioUnitario || 0) * (it.cantidad || 0);
        productos.set(it.name, prev);
      }
    }
    const lista = [...productos.entries()].map(([nombre, v]) => ({ nombre, ...v }));
    const masVendidos = [...lista].sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos);
    const menosVendidos = [...lista].sort((a, b) => a.unidades - b.unidades || a.ingresos - b.ingresos);
    const porIngresos = [...lista].sort((a, b) => b.ingresos - a.ingresos);
    const unidadesTotales = lista.reduce((a, x) => a + x.unidades, 0);

    const porHora = Array.from({ length: 24 }, (_, h) => ({ label: String(h), titulo: `${h}:00`, valor: 0 }));
    const porDiaSemana = new Map();
    const porFecha = new Map();
    for (const p of delPeriodo) {
      porHora[horaDelDia(p.createdAt)].valor += p.total || 0;
      const d = diaDeSemana(p.createdAt);
      porDiaSemana.set(d, (porDiaSemana.get(d) || 0) + (p.total || 0));
      const f = formatoFechaISO(p.createdAt);
      porFecha.set(f, (porFecha.get(f) || 0) + (p.total || 0));
    }
    const diasSerie = Math.min(rangoActual.dias === null ? 30 : rangoActual.dias + 1, 31);
    const porDia = [];
    for (let i = diasSerie - 1; i >= 0; i--) {
      const f = fechaISOHaceDias(i);
      porDia.push({ label: f.slice(8), titulo: f, valor: porFecha.get(f) || 0 });
    }
    const mejorDia = [...porDiaSemana.entries()].sort((a, b) => b[1] - a[1])[0];
    const horaPico = [...porHora].sort((a, b) => b.valor - a.valor)[0];

    return {
      totalVentas,
      pedidos: delPeriodo.length,
      ticketPromedio: delPeriodo.length ? totalVentas / delPeriodo.length : 0,
      unidadesTotales,
      masVendidos: masVendidos.slice(0, 10),
      menosVendidos: menosVendidos.slice(0, 5),
      porIngresos: porIngresos.slice(0, 8),
      porHora,
      porDia,
      mejorDia: mejorDia ? mejorDia[0] : null,
      horaPico: horaPico && horaPico.valor > 0 ? horaPico.titulo : null,
      porCanal: contar(delPeriodo, (p) => p.canal, CANAL_LABEL),
      porPago: contar(delPeriodo, (p) => p.metodoPago, PAGO_LABEL),
      porEntrega: contar(delPeriodo, (p) => p.tipoEntrega, Object.fromEntries(Object.entries(TIPO_ENTREGA_LABEL).map(([k, v]) => [k, v.replace(/^\S+\s/, '')]))),
    };
  }, [delPeriodo, rangoActual]);

  if (cargando) return <p className="empty-msg">Cargando analíticas…</p>;
  if (error) return <p className="empty-msg">{error}</p>;

  return (
    <section className="analiticas-wrap">
      <div className="historial-toolbar">
        <span style={{ fontWeight: 700 }}>Periodo:</span>
        {RANGOS.map((r) => (
          <button key={r.key} className={`tab-btn ${rango === r.key ? 'active' : ''}`} onClick={() => setRango(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="resumen-dia">
        <div className="resumen-item">
          <span>Ventas</span>
          <strong>{formatoCOP(stats.totalVentas)}</strong>
        </div>
        <div className="resumen-item">
          <span>Pedidos</span>
          <strong>{stats.pedidos}</strong>
        </div>
        <div className="resumen-item">
          <span>Ticket promedio</span>
          <strong>{formatoCOP(stats.ticketPromedio)}</strong>
        </div>
        <div className="resumen-item">
          <span>Productos vendidos</span>
          <strong>{stats.unidadesTotales}</strong>
        </div>
      </div>

      <p className="historial-aviso">Solo cuentan las ventas con el pago confirmado. Los pedidos anteriores al control de pagos se cuentan como confirmados.</p>

      {stats.pedidos === 0 ? (
        <p className="empty-msg">No hay ventas con pago confirmado en este periodo.</p>
      ) : (
        <div className="analiticas-grid">
          <Tarjeta titulo="🏆 Productos más vendidos (unidades)">
            <BarrasHorizontales filas={stats.masVendidos.map((p) => ({ label: p.nombre, valor: p.unidades, ingresos: p.ingresos }))} formato={(f) => `${f.valor} · ${formatoCOP(f.ingresos)}`} />
          </Tarjeta>

          <Tarjeta titulo="📉 Productos menos vendidos">
            <BarrasHorizontales
              filas={stats.menosVendidos.map((p) => ({ label: p.nombre, valor: p.unidades, ingresos: p.ingresos, color: '#d9772e' }))}
              formato={(f) => `${f.valor} · ${formatoCOP(f.ingresos)}`}
            />
            <p className="analitica-nota">Solo se listan productos que se vendieron al menos una vez en el periodo.</p>
          </Tarjeta>

          <Tarjeta titulo="💰 Productos que más dinero dejan">
            <BarrasHorizontales filas={stats.porIngresos.map((p) => ({ label: p.nombre, valor: p.ingresos, color: 'var(--brand-success)' }))} formato={(f) => formatoCOP(f.valor)} />
          </Tarjeta>

          <Tarjeta titulo="📅 Ventas por día" ancha>
            <Columnas columnas={stats.porDia} formato={formatoCOP} />
            {stats.mejorDia && <p className="analitica-nota">Día de la semana más fuerte: <strong>{stats.mejorDia}</strong></p>}
          </Tarjeta>

          <Tarjeta titulo="🕒 Ventas por hora del día" ancha>
            <Columnas columnas={stats.porHora} formato={formatoCOP} />
            {stats.horaPico && <p className="analitica-nota">Hora pico: <strong>{stats.horaPico}</strong></p>}
          </Tarjeta>

          <Tarjeta titulo="📲 Por canal">
            <BarrasHorizontales filas={stats.porCanal} formato={(f) => `${f.valor} pedidos`} />
          </Tarjeta>

          <Tarjeta titulo="💳 Por método de pago">
            <BarrasHorizontales filas={stats.porPago} formato={(f) => `${f.valor} pedidos`} />
          </Tarjeta>

          <Tarjeta titulo="🛵 Por tipo de entrega">
            <BarrasHorizontales filas={stats.porEntrega} formato={(f) => `${f.valor} pedidos`} />
          </Tarjeta>
        </div>
      )}
    </section>
  );
}
