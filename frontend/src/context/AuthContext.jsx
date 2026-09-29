import { createContext, useContext, useEffect, useState } from "react";
import {
  ENDPOINTS,
  apiFetch,
  clearToken,
  getToken,
  setToken,
} from "../config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // Al cargar la página, si hay token guardado, recupera el usuario
  useEffect(() => {
    if (!getToken()) return;
    apiFetch(ENDPOINTS.AUTH_ME)
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (correo, password) => {
    const data = await apiFetch(ENDPOINTS.AUTH_LOGIN, {
      method: "POST",
      body: { correo, password },
      auth: false,
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (nombre, correo, password) => {
    await apiFetch(ENDPOINTS.AUTH_REGISTER, {
      method: "POST",
      body: { nombre, correo, password },
      auth: false,
    });
    return login(correo, password);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
