import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import AppRouter from "./AppRouter";
import io from "socket.io-client";

let socket;

function App() {
  const { user } = useAuth();

  useEffect(() => {
    socket = io("http://localhost:4000");

    if (user && user._id) {
      socket.emit("register", user._id);
      console.log("✅ socket connected + registered:", user._id);
    } else {
      console.warn("🔒 not logged in, socket not registered");
    }

    socket.on("receive-notification", (notification) => {
      console.log("🔔 New Notification:", notification);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]); // מאזין אם המשתמש משתנה

  return (
    <AppRouter />
  );
}

export default App;
