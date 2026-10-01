import { createContext, useContext, useEffect, useState } from "react";
import {
  ENDPOINTS,
  apiFetch,
  clearToken,
  getToken,
  setToken,
} from "../config/api";
import {
  firebaseSignOut,
  loginWithEmail,
  loginWithGoogle as googleLogin,
  registerWithEmail,
} from "../lib/firebaseAuth";

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

  const applySession = ({ access_token, user }) => {
    setToken(access_token);
    setUser(user);
    return user;
  };

  const login = async (correo, password) =>
    applySession(await loginWithEmail(correo, password));

  const register = async (nombre, correo, password) =>
    applySession(await registerWithEmail(nombre, correo, password));

  const loginWithGoogle = async () => {
    const data = await googleLogin();
    return data ? applySession(data) : null;
  };

  const logout = () => {
    clearToken();
    setUser(null);
    firebaseSignOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);