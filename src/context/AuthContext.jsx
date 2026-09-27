import { createContext, useContext, useMemo, useState } from 'react';
import { ownLogin, fetchSiteUsers } from '../lib/api';

const AuthContext = createContext(null);
const ADMIN_EMAIL = 'angelvillota4@gmail.com';
const ADMIN_PASSWORD = '1234';
const SESSION_KEY = 'receptor_pedidos_sesion';

function getSesion() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}
function setSesionStorage(email) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
  } catch {
    /* modo privado: sigue sin recordar sesión */
  }
}
function clearSesionStorage() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSesion());

  // Admin fijo -> propios usuarios (login.php) -> respaldo: usuarios del sitio.
  const login = async (emailRaw, password) => {
    const email = emailRaw.trim().toLowerCase();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setSesionStorage(email);
      setSession({ email });
      return { success: true };
    }
    try {
      const data = await ownLogin(email, password);
      if (data.success) {
        setSesionStorage(email);
        setSession({ email });
        return { success: true };
      }
    } catch {
      /* sigue al respaldo del sitio */
    }
    try {
      const data = await fetchSiteUsers();
      if (data.success) {
        const users = data.users || [];
        const match = users.find((u) => (u.email || '').toLowerCase() === email && u.password === password);
        if (match) {
          setSesionStorage(email);
          setSession({ email });
          return { success: true };
        }
      }
    } catch {
      /* cae al error genérico */
    }
    return { success: false, error: 'Correo o contraseña incorrectos.' };
  };

  const logout = () => {
    clearSesionStorage();
    setSession(null);
  };

  const value = useMemo(() => ({ session, login, logout, isAdmin: session?.email === ADMIN_EMAIL }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
