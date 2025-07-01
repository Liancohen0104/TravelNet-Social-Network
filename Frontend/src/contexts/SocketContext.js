// src/contexts/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user || !user._id) return;

    // חיבור לשרת
    const newSocket = io("http://localhost:4000"); 
    setSocket(newSocket);

    newSocket.emit("register", user._id);
    console.log("✅ socket connected + registered:", user._id);

    return () => {
      newSocket.disconnect();
      console.log("❌ socket disconnected");
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
