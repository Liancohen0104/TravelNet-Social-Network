const Conversation = require("../models/Conversation");
const Message = require("../models/Chat");
const User = require("../models/User");

// שליפת כל השיחות של המשתמש
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const skip = (page - 1) * pageSize;
    const unreadMessagesCount = await Message.countDocuments({
      recipient: userId,
      isRead: false,
    });

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "firstName lastName imageURL is_online")
      .populate({
        path: "lastMessage",
        select: "text isRead sender recipient createdAt", 
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
      totalPages: Math.ceil(totalConversations / pageSize),
      unreadMessagesCount
    });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// יצירת שיחה חדשה או שליפת קיימת
exports.startConversation = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;

  if (!friendId || friendId === userId) {
    return res.status(400).json({ error: "Invalid friend ID" });
  }

  try {
    // חיפוש שיחה קיימת
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, friendId], $size: 2 },
    });

    // אם אין שיחה – צור חדשה
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, friendId],
      });
    }

    res.status(200).json(conversation);
  } catch (err) {
    console.error("Error starting conversation", err);
    res.status(500).json({ error: "Failed to start or get conversation" });
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

    // כמה הודעות לא נקראו בשיחה הזו
    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      recipient: userId,
      isRead: false,
    });

    // סימון ההודעות כנקראו
    const result = await Message.updateMany(
      { conversation: conversationId, recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // הורדה של הכמות מהמשתמש
    await User.findByIdAndUpdate(userId, {
      $inc: { unreadMessagesCount: -unreadCount },
    });

    res.json({
      message: "Messages marked as read",
      updatedCount: result.modifiedCount,
      removedFromUnreadCounter: unreadCount
    });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
};

// סימון כל השיחות כנקראו
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;
  const unreadMessages = await Message.find({ recipient: userId, isRead: false });
  const count = unreadMessages.length;

  await Message.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
  await User.findByIdAndUpdate(userId, { $inc: { unreadMessagesCount: -count } });

  res.json({ message: "All messages marked as read", updated: count });
};

// מחיקת כל השיחות
exports.deleteAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // מציאת כל השיחות של המשתמש
    const userConversations = await Conversation.find({ participants: userId });

    const conversationIds = userConversations.map((c) => c._id);

    // מחיקת כל ההודעות שבהן המשתמש מעורב (שולח או מקבל)
    await Message.deleteMany({
      conversation: { $in: conversationIds },
      $or: [{ sender: userId }, { recipient: userId }],
    });

    // מחיקת שיחות (אפשר למחוק רק אם המשתמש הוא היחיד או למחוק רק לעצמו – כאן מוחק הכל)
    await Conversation.deleteMany({ participants: userId });

    // אפס את ספירת הודעות שלא נקראו
    await User.findByIdAndUpdate(userId, { unreadMessagesCount: 0 });

    res.json({ message: "All conversations deleted successfully" });
  } catch (err) {
    console.error("Failed to delete all conversations", err);
    res.status(500).json({ error: "Failed to delete conversations" });
  }
};

// מחיקת שיחה
exports.deleteSingleConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      recipient: userId,
      isRead: false
    });

    // שליפת השיחה ובדיקה שהמשתמש אכן משתתף בה
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

    // מחיקת הודעות של המשתמש מהשיחה הזו
    const deletedMessages = await Message.deleteMany({
      conversation: conversationId,
      $or: [{ sender: userId }, { recipient: userId }]
    });

    // מחיקת השיחה עצמה (או רק אם הוא המשתתף היחיד)
    await Conversation.findByIdAndDelete(conversationId);

    if (unreadCount > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { unreadMessagesCount: -unreadCount }
      });
    }

    res.json({ message: "Conversation deleted", deletedMessages: deletedMessages.deletedCount });
  } catch (err) {
    console.error("Failed to delete conversation", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};
