// מודל קבוצה: שם, תיאור, תמונה, יוצר וחברים

const { Schema, model, models } = require('mongoose');

const groupSchema = new Schema(
  {
    // שם הקבוצה
    name: { type: String, required: true, unique: true }, 

    // תיאור הקבוצה
    description: { type: String },

    // תמונה של הקבוצה
    imageURL: { type: String },

    // יוצר הקבוצה
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // האם הקבוצה פרטית
    isPublic: { type: Boolean, default: false },

    // חברי הקבוצה
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // בקשות הצטרפות לקבוצה
    pendingRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = models.Group || model('Group', groupSchema);
