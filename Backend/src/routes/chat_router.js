// נתיבים לצ'אט

const express = require("express");
const router = express.Router();
const { upload } = require("../services/cloudinary_service");
const chatController = require("../controllers/chat_controller");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/send", upload.single("file"), verifyToken, chatController.sendMessage);

module.exports = router;