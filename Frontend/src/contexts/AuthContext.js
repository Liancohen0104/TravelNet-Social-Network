// שליטה על אימות משתמשים והטוקן

import { createContext, useContext, useEffect, useState } from "react";
import usersApi from "../services/usersApi"; 
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      usersApi
        .getCurrentUser()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
        });
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await usersApi.login(email, password);
      localStorage.setItem("token", res.token);
      setUser(res.user);
      navigate("/groups");
    } catch (err) {
      throw new Error("Login failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
