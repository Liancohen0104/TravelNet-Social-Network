const Conversation = require("../models/Conversation");
const Message = require("../models/Chat");

// שליפת כל השיחות של המשתמש
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // קבלת פרמטרים מה-query string עם ערכי ברירת מחדל
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    // שליפת שיחות עם הגבלה ודילוג (pagination)
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "firstName lastName imageURL")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName imageURL"
        }
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalConversations = await Conversation.countDocuments({ participants: userId });

    res.json({
      conversations,
      page,
      pageSize,
      totalConversations,
      totalPages: Math.ceil(totalConversations / pageSize)
    });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// שליפת הודעות לפי שיחה
exports.getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 }) // מהחדשות לישנות
      .skip(skip)
      .limit(limit);

    // נחזיר הפוך כדי שהתצוגה תהיה מהישן לחדש
    res.json(messages.reverse());
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// סימון הודעות כנקראו בשיחה מסוימת
exports.markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const result = await Message.updateMany(
      { conversation: conversationId, recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "Messages marked as read", updatedCount: result.modifiedCount });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
};