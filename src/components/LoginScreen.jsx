import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    const result = await login(email, password);
    setSending(false);
    if (!result.success) setError(result.error);
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginTop: 0, color: 'var(--brand-text-dark)' }}>
          Iniciar sesión
        </h2>
        <p style={{ fontSize: 13, color: '#8a7a6a', marginTop: -8 }}>Usa el mismo usuario y contraseña de la página del negocio.</p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
          </label>
          {error && <p style={{ color: 'var(--brand-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={sending} style={btnStyle}>
            {sending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6ede0' };
const cardStyle = { background: '#fff', border: '2px solid var(--brand-card-border)', borderRadius: 16, padding: '28px 32px', width: 340, maxWidth: '90vw' };
const labelStyle = { fontSize: 13, color: '#6b5a4d', display: 'flex', flexDirection: 'column', gap: 4 };
const inputStyle = { padding: '9px 10px', borderRadius: 8, border: '1px solid #e2cfb4', background: '#fffdfa', fontSize: 14 };
const btnStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 14,
  padding: '10px 20px',
  borderRadius: 24,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--brand-orange)',
  color: 'var(--brand-text-dark)',
  marginTop: 6,
};
