// מחזיר תוצאות חיפוש - 3 קבוצות 3 אנשים ופוסטים רלוונטים לחיפוש

const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');

// חיפוש קבוצות (לפי שם ותיאור)
const searchGroups = async (query, limit = 3) => {
  return Group.find({
    $or: [
      { name:        { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } }
    ]
  })
  .select('name description imageURL isPublic members')
  .limit(limit);
};

// חיפוש משתמשים (לפי שם פרטי, שם משפחה, שם מלא ומיקום)
const searchUsers = async (query, limit = 3) => {
  const regex = new RegExp(query, 'i');

  return User.find({
    $or: [
      { firstName: regex },
      { lastName: regex },
      { fullName: regex },
      { location: regex }, 
    ]
  })
    .select('-password -resetPasswordToken -resetPasswordExpires')
    .limit(limit);
};

// חיפוש פוסטים (לפי תוכן או יוצר)
// חיפוש פוסטים לפי תוכן + שם יוצר
const searchPosts = async (query, limit = 3) => {
  const regex = new RegExp(query, 'i');

  const matchingUsers = await User.find({
    $or: [
      { firstName: regex },
      { lastName: regex },
      { fullName: regex }
    ]
  });

  const userIds = matchingUsers.map(user => user._id);

  return Post.find({
    $or: [
      { content: regex },
      { author: { $in: userIds } }
    ]
  })
    .populate('author', 'firstName lastName imageURL')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = {
  searchGroups,
  searchUsers,
  searchPosts
};
