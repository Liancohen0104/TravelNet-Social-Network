// מודל שיחה

const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  // משתתפי השיחה
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // הודעה אחרונה בשיחה
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  // עדכון אחרון בשיחה
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Conversation", conversationSchema);
