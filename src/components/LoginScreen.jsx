import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { loginWithGoogle, googleClientId } = useAuth();
  const btnRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!googleClientId) {
      setError('El login con Google todavía no está configurado en esta app.');
      return;
    }
    if (!window.google?.accounts?.id) {
      setError('No se pudo cargar el login de Google. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (resp) => {
        const ok = await loginWithGoogle(resp.credential);
        if (!ok) setError('No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', width: 260, locale: 'es' });
    }
  }, [googleClientId, loginWithGoogle]);

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, marginTop: 0, color: 'var(--brand-text-dark)' }}>
          Iniciar sesión
        </h2>
        <p style={{ fontSize: 13, color: '#8a7a6a', marginTop: -8 }}>
          Usa tu cuenta de Google. Solo los correos autorizados por el administrador ven la cola de pedidos.
        </p>
        <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }} />
        {error && <p style={{ color: 'var(--brand-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}

const overlayStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6ede0' };
const cardStyle = { background: '#fff', border: '2px solid var(--brand-card-border)', borderRadius: 16, padding: '28px 32px', width: 340, maxWidth: '90vw' };
