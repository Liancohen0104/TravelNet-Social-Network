const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversation_controller");
const { verifyToken } = require("../middlewares/authMiddleware");

router.get("/all-conversations",        verifyToken, conversationController.getConversations);
router.get("/:conversationId/messages", verifyToken, conversationController.getMessagesByConversation);
router.post("/:conversationId/mark-read",           verifyToken, conversationController.markMessagesAsRead);

module.exports = router;
