// נתיבים של התראות

const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification_controller.js");
const { verifyToken } = require("../middlewares/authMiddleware");

router.get("/all-notification",             verifyToken, notificationController.getUserNotifications);
router.get("/unread-notification",          verifyToken, notificationController.getUnreadNotifications);
router.patch("/:id/read",                   verifyToken, notificationController.markAsRead);
router.patch("/read-all",                   verifyToken, notificationController.markAllAsRead);
router.delete("/:id/delete-notification",   verifyToken, notificationController.deleteNotification);

module.exports = router;
