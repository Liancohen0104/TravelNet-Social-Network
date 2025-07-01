const { Server } = require("socket.io");
const User = require("../models/User");

let io = null;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
    pingTimeout: 10000, // מזהה ניתוק תוך 10 שניות
  });

  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("register", async (userId) => {
      try {
        socket.userId = userId;
        socket.join(userId);
        console.log(`👤 User ${userId} joined their personal room`);

        const user = await User.findById(userId);
        if (user) {
          user.is_online = true;
          user.lastLogin = new Date();
          await user.save({ validateBeforeSave: false });

          console.log(`🟢 ${user.firstName} ${user.lastName} is now online`);

          // עדכון כללי
          io.emit("user-status-changed", {
            userId,
            is_online: true,
            lastLogin: user.lastLogin,
          });
        }
      } catch (err) {
        console.error("⚠️ Failed to mark user online:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      try {
        if (!socket.userId) return;

        const user = await User.findById(socket.userId);
        if (user) {
          user.is_online = false;
          user.lastLogin = new Date();
          await user.save({ validateBeforeSave: false });

          console.log(`⚪ ${user.firstName} ${user.lastName} went offline`);

          // עדכון כללי
          io.emit("user-status-changed", {
            userId: socket.userId,
            is_online: false,
            lastLogin: user.lastLogin,
          });
        }
      } catch (err) {
        console.error("⚠️ Failed to mark user offline:", err.message);
      }
    });

    // שידור בקשת חברות בלייב 
    socket.on("send-friend-request", ({ toUserId }) => {
      console.log(`📩 Sending live friend request to ${toUserId}`);
      io.to(toUserId).emit("new-friend-request");
    });

    // שידור בקשת הצטרפות לקבוצה בלייב 
    socket.on("send-group-request", ({ toUserId }) => {
      console.log(`📩 Sending live group request to ${toUserId}`);
      io.to(toUserId).emit("new-group-request");
    });

  });
}

function getIO() {
  if (!io) throw new Error("❗ Socket.io not initialized");
  return io;
}

module.exports = { setupSocket, getIO };
