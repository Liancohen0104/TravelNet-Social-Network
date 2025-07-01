const { Schema, model, models } = require('mongoose');

const notificationSchema = new Schema({
  // מקבל ההודעה
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // שולח ההודעה
  sender: { type: Schema.Types.ObjectId, ref: "User" },
  // סוג ההודעה
  type: { type: String, enum: ['friend_request', 'comment', 'group_post', 'group_request', 'approved_request', 'share', 'message', 'like'], required: true },
  // תוכן ההודעה
  message: { type: String, required: true },
  // כתובת לתמונה (של קבוצה או משתמש)
  image: { type: String }, 
  // לינק בהודעה, אם יש
  link: { type: String }, 
  // האם ההודעה נקראה
  isRead: { type: Boolean, default: false }, 
  // תאריך יצירת ההודעה
  createdAt: { type: Date, default: Date.now }
});

module.exports = models.Notification || model("Notification", notificationSchema);