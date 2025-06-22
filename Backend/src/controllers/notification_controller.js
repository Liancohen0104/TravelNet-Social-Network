const Notification = require("../models/Notification");
const { getIO } = require("../sockets/socket");

// שליפת התראות לפי משתמש
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: userId });

    res.json({
      notifications,
      total,
      hasMore: skip + notifications.length < total
    });
  } catch (err) {
    res.status(500).json({ error: "Error fetching notifications" });
  }
};

// שליפת התראות שלא נקראו
exports.getUnreadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const unreadNotifications = await Notification.find({
      recipient: userId,
      isRead: false
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(unreadNotifications);
  } catch (err) {
    res.status(500).json({ error: "Error fetching unread notifications" });
  }
};

// סימון כהתראה נקראה
exports.markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Error marking notification as read" });
  }
};

// סימון כל ההתראות כנקראו
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id }, { isRead: true });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Error marking all notifications as read" });
  }
};

// מחיקת התראה
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Error deleting notification" });
  }
};
