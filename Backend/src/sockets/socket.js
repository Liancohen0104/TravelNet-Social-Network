const { Server } = require("socket.io");

let io = null;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // רישום המשתמש לחדר האישי שלו
    socket.on("register", (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined their personal room`);
    });

    // ניתוק
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
}

function getIO() {
  if (!io) throw new Error("❗ Socket.io not initialized");
  return io;
}

module.exports = { setupSocket, getIO };
