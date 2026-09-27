import { useEffect, useState } from 'react';
import { usuariosApi } from '../lib/api';

export default function UsuariosTab() {
  const [usuarios, setUsuarios] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  const cargar = async () => {
    try {
      const data = await usuariosApi({ accion: 'listar' });
      if (!data.success) {
        setLoadError(data.error || 'No se pudo cargar la lista.');
        return;
      }
      setLoadError('');
      setUsuarios(data.usuarios || []);
    } catch {
      setLoadError('No se pudo conectar con el servidor.');
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const data = await usuariosApi({ accion: 'crear', email });
      if (!data.success) {
        setFormError(data.error || 'No se pudo agregar el correo.');
        return;
      }
      setEmail('');
      cargar();
    } catch {
      setFormError('No se pudo conectar con el servidor.');
    }
  };

  const eliminar = async (userEmail) => {
    if (!confirm(`¿Eliminar el acceso de ${userEmail}?`)) return;
    await usuariosApi({ accion: 'eliminar', email: userEmail }).catch(() => {});
    cargar();
  };

  return (
    <section>
      <div style={{ padding: '20px 20px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--brand-text-dark)' }}>Agregar acceso</h3>
        <p style={{ fontSize: 12, color: '#8a7a6a', maxWidth: 340 }}>
          Esta persona podrá entrar con su propia cuenta de Google (ya no con contraseña) y ver la cola de pedidos.
        </p>
        <form onSubmit={crear} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}>
          <label style={labelStyle}>
            Correo de Google
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </label>
          {formError && <p style={{ color: 'var(--brand-danger)', fontSize: 13, margin: 0 }}>{formError}</p>}
          <button type="submit" className="tab-btn" style={{ alignSelf: 'flex-start' }}>
            Agregar
          </button>
        </form>
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--brand-text-dark)', padding: '20px 20px 0' }}>Usuarios con acceso</h3>
      {loadError ? (
        <p className="empty-msg">{loadError}</p>
      ) : (
        <ul className="usuarios-lista">
          {usuarios.length === 0 && <li>Todavía no has agregado ningún correo extra.</li>}
          {usuarios.map((u) => (
            <li key={u.email}>
              <span>{u.email}</span>
              <button className="btn-delete" style={{ borderRadius: 8, padding: '4px 10px', fontSize: 12 }} onClick={() => eliminar(u.email)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const labelStyle = { fontSize: 13, color: '#6b5a4d', display: 'flex', flexDirection: 'column', gap: 4 };
const inputStyle = { padding: '9px 10px', borderRadius: 8, border: '1px solid #e2cfb4', background: '#fffdfa', fontSize: 14 };
