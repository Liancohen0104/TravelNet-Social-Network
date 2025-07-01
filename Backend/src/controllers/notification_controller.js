const Notification = require("../models/Notification");
const User = require("../models/User");

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
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.isRead) return res.sendStatus(204);

    notification.isRead = true;
    await notification.save();

    // הפחתת מונה ההתראות הלא נקראו
    await User.findByIdAndUpdate(notification.recipient, {
      $inc: { unreadNotificationsCount: -1 }
    });

    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Error marking notification as read" });
  }
};

// סימון כל ההתראות כנקראו
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });

    // איפוס מונה ההתראות הלא נקראו
    await User.findByIdAndUpdate(userId, { unreadNotificationsCount: 0 });

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

// מחיקת כל ההתראות
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });

    // איפוס מונה ההתראות למשתמש
    await User.findByIdAndUpdate(req.user.id, { unreadNotificationsCount: 0 });

    res.sendStatus(204);
  } catch (err) {
    console.error("Error deleting all notifications:", err);
    res.status(500).json({ error: "Error deleting all notifications" });
  }
};
