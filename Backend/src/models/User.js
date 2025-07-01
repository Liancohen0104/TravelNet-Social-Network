// מודל משתמש: שם משתמש ייחודי, אימייל ייחודי, סיסמה מוצפנת, תפקיד משתמש רגיל/אדמין

const { Schema, model, models } = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const validator = require('validator'); 

const userSchema = new Schema(
  {
    // שם פרטי ושם משפחה
    firstName: { type: String, trim: true, required: true },
    lastName:  { type: String, trim: true, required: true },

    // מייל ייחודי + ולידציה 
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Invalid email address'
      }
    },

    // סיסמא + ולידציה שאורכה גדול מ6
    password: { type: String, required: true, minlength: 6 },

    // זיהוי תפקיד משתמש - רגיל או אדמין
    role: { type: String, enum: ['member', 'admin'], default: 'member' },

    // תמונה
    imageURL: {
      type: String,
      default: "https://res.cloudinary.com/druxrfbst/image/upload/v1750453874/default_profile_eqtr4y.jpg"
    },

    // ביו לתיאור על המשתמש
    bio: { type: String, maxlength: 160 },

    // עיר מגורים
    location:  { type: String },

    // תאריך לידה
    dateOfBirth: { type: Date },

    // איפוס סיסמא
    resetPasswordToken:   String,
    resetPasswordExpires: Date,

    // פעילות אחרונה
    lastLogin: Date,

    // האם מחובר
    is_online: {
      type: Boolean,
      default: false,
    },

    // כמות התראות שלא נקראו
    unreadNotificationsCount: {type: Number, default: 0 },

    // כמות הודעות שלא נקראו
    unreadMessagesCount: { type: Number, default: 0 },

    // חברים של המשתמש
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // בקשות חברות שנשלחו
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    // בקשות חברות ממשתמשים אחרים
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // קבוצות בהן חבר המשתמש
    groups:  [{ type: Schema.Types.ObjectId, ref: 'Group' }],

    // פוסטים ששמר המשתמש
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
  },
  { timestamps: true }  // מוסיף createdAt + updatedAt
);

// DB משתנה שם מלא וירטואלי - מחושב ונגיש אבל לא נשמר ב
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// הצפנת סיסמא
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();       
  this.password = await bcrypt.hash(this.password, 10);   
  next();
});

// ולידציה תאריך לידה - משתמש בן 13 לפחות
userSchema.pre('save', function (next) {
  if (this.dateOfBirth) {
    const age =
      (Date.now() - this.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 13) {
      return next(new Error('Minimal age to register is 13'));
    }
  }
  next();
});

// השוואת סיסמא של המשתמש לסיסמא מוצפנת
userSchema.methods.comparePassword = function (plainPwd) {
  return bcrypt.compare(plainPwd, this.password);
};

// יצירת טוקן איפוס סיסמא
userSchema.methods.generatePasswordReset = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken   = token;
  this.resetPasswordExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 שעות
  return token;
};

module.exports = models.User || model('User', userSchema);


