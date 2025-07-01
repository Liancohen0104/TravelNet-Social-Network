// מודל הודעה

const { Schema, model, models } = require('mongoose');

const messageSchema = new Schema({
  // היסטוריית השיחה
  conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
  // שולח ההודעה
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // מקבל ההודעה
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // תוכן ההודעה
  text: { type: String, required: function() { return !this.attachment?.url; } },
  // צירוף מדיה
  attachment: {
    url: { type: String },
    type: { type: String, enum: ["image", "video", "pdf", "link", "other"] }
  },
  // זמן יצירת ההודעה
  createdAt: { type: Date, default: Date.now },
  // האם ההודעה נקראה
  isRead: { type: Boolean, default: false }
});

module.exports = models.Message || model("Message", messageSchema);
