import { createContext, useContext, useEffect, useState } from "react";
import usersApi from "../services/usersApi";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          console.log("Token expired");
          logout(); // הטוקן פג תוקף
          return;
        }
      } catch (err) {
        console.log("Token invalid");
        logout(); // הטוקן לא תקין
        return;
      }

      // טוקן תקף – נבדוק מול השרת
      setLoading(true);
      usersApi
        .getCurrentUser()
        .then((res) => {
          setUser(res.user);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
          setLoading(false);
          navigate("/login");
        });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (decoded.exp * 1000 < Date.now()) {
            console.log("Token expired during session");
            logout(); 
          }
        } catch (err) {
          console.log("Token invalid during session");
          logout();
        }
      }
    }, 60 * 1000); 

    return () => clearInterval(interval); 
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
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
