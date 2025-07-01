// מודל קבוצה: שם, תיאור, תמונה, יוצר וחברים

const { Schema, model, models } = require('mongoose');

const groupSchema = new Schema(
  {
    // שם הקבוצה
    name: { type: String, required: true, unique: true }, 

    // תיאור הקבוצה
    description: { type: String },

    // תמונה של הקבוצה
    imageURL: {
      type: String,
      default: "https://res.cloudinary.com/druxrfbst/image/upload/v1750453874/default_profile_eqtr4y.jpg"
    },

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
