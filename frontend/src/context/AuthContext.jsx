import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);
const STORAGE_KEY = 'repartix_token';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function hidratar() {
      if (!token) {
        setCargando(false);
        return;
      }
      try {
        const { usuario } = await authApi.obtenerPerfil(token);
        if (!cancelado) setUsuario(usuario);
      } catch {
        if (!cancelado) {
          localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUsuario(null);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    hidratar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  const login = useCallback(async ({ email, password }) => {
    const respuesta = await authApi.iniciarSesion({ email, password });
    localStorage.setItem(STORAGE_KEY, respuesta.token);
    setToken(respuesta.token);
    setUsuario(respuesta.usuario);
  }, []);

  const registro = useCallback(async ({ nombre, email, password }) => {
    const respuesta = await authApi.registrar({ nombre, email, password });
    localStorage.setItem(STORAGE_KEY, respuesta.token);
    setToken(respuesta.token);
    setUsuario(respuesta.usuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  const valor = {
    usuario,
    token,
    cargando,
    autenticado: Boolean(usuario),
    login,
    registro,
    logout,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
