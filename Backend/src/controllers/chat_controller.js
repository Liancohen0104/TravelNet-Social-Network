const { getIO } = require("../sockets/socket");
const Message = require("../models/Chat");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");

// זיהוי סוג הקובץ
function determineFileType(mime) {
  if (mime.startsWith("image")) return "image";
  if (mime.startsWith("video")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

// שליחת הודעה
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId, text } = req.body;
    const isRead = req.body.isRead === "true";

    let attachment = null;
    if (req.file && req.file.path) {
      attachment = {
        url: req.file.path,
        type: determineFileType(req.file.mimetype),
      };
    }

    // חיפוש שיחה קיימת
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId], $size: 2 },
    });

    // יצירת שיחה אם לא קיימת
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
      });
    }

    // יצירת הודעה
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      recipient: recipientId,
      text,
      attachment,
      createdAt: new Date(),
      isRead
    });

    // עדכון כמות הודעות אצל המקבל
    if (!isRead) {
      await User.findByIdAndUpdate(recipientId, {
        $inc: { unreadMessagesCount: 1 },
      });
    }

    // עדכון שיחה
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();
    
    // שליחה בזמן אמת
    const io = getIO();
    io.to(recipientId).emit("receive-message", message);

    res.status(201).json(message);
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ error: "Message send failed" });
  }
};