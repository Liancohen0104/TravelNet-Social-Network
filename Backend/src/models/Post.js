// מודל פוסט: יוצר, שייך לקבוצה או לא, תוכן, תאריך יצירה, לייקים ותגובות

const { Schema, model, models } = require('mongoose');

const postSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: false }, // פוסט כללי או שייך לקבוצה
  content: { type: String, required: false },
  imageUrls: [{ type: String }],
  videoUrls: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isPublic: { type: Boolean, default: false },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      text: String,
      createdAt: { type: Date, default: Date.now },
      mentionedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }] // משתמשים מתויגים בתגובה
    }
  ],

  commentsCount: {type: Number, default: 0 },

  sharedFrom: { type: Schema.Types.ObjectId, ref: 'Post', default: null }, // אם הפוסט הוא שיתוף אז זה הפוסט ששותף
  sharedToGroup: { type: Schema.Types.ObjectId, ref: 'Group', default: null } // קבוצה שאליה שותף הפוסט
});

module.exports = models.Post || model('Post', postSchema);


