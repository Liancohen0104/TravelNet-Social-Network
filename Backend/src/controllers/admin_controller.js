// פונקציות שירות

const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Conversation = require("../models/Conversation");
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");

// שליפת כל המשתמשים
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can access users list' });
    }

    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password -resetPasswordToken -resetPasswordExpires');

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// מחיקת משתמש
exports.deleteUser = async (req, res) => {
  try {
    // וידוא הרשאות
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete users' });
    }

    const userId = req.params.id;

    // בדיקה אם המשתמש קיים
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. מחיקת כל ההודעות ששלח
    await Chat.deleteMany({ sender: userId });

    // 2. מחיקת כל השיחות שבהן הוא משתתף
    await Conversation.deleteMany({ participants: userId });

    // 3. מחיקת כל ההתראות ששלח או קיבל
    await Notification.deleteMany({
      $or: [{ recipient: userId }, { sender: userId }]
    });

    // 4. מחיקת כל הפוסטים של המשתמש
    const userPosts = await Post.find({ author: userId }).select("_id");
    const userPostIds = userPosts.map((p) => p._id);
    await Post.deleteMany({ author: userId });

    // 5. מחיקת כל התגובות של המשתמש
    await Post.updateMany(
      { "comments.user": userId },
      { $pull: { comments: { user: userId } } }
    );

    // 6. הסרת המשתמש מכל רשימות חברים
    await User.updateMany(
      {},
      {
        $pull: {
          friends: userId,
          friendRequestsSent: userId,
          friendRequestsReceived: userId,
          savedPosts: { $in: userPostIds }
        }
      }
    );

    // 7. מחיקת המשתמש עצמו
    await User.findByIdAndDelete(userId);

    // 8. מחיקת קבוצות שהוא יצר
    await Group.deleteMany({ creator: userId });

    // 9. הסרתו מקבוצות אחרות
    await Group.updateMany(
      {},
      {
        $pull: {
          members: userId,
          pendingRequests: userId,
          invitedUsers: userId
        }
      }
    );

    res.json({ message: 'User and all related data deleted successfully' });

  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: err.message });
  }
};

// קבלת כל הקבוצות
exports.getAllGroups = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const [groups, total] = await Promise.all([
      Group.find()
        .populate('creator', 'firstName lastName email')
        .skip(skip)
        .limit(limit),
      Group.countDocuments()
    ]);

    res.json({ groups, total });
  } catch (err) {
    console.error('Admin get all groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// מחיקת קבוצה
exports.deleteGroupByAdmin = async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // 1. מחיקת כל הפוסטים שנכתבו בקבוצה
    await Post.deleteMany({ group: groupId });

    // 2. מחיקת שיחות קבוצתיות (אם קיימות)
    await Conversation.deleteMany({ group: groupId });

    // 3. מחיקת התראות שקשורות לקבוצה
    await Notification.deleteMany({ group: groupId });

    // 4. הסרת הקבוצה מכל חברי המשתמשים
    await User.updateMany(
      {},
      {
        $pull: {
          groups: groupId,
          pendingGroupRequests: groupId,
        }
      }
    );

    // 5. מחיקת הקבוצה עצמה
    await group.deleteOne();

    res.json({ message: 'Group and related data deleted successfully' });

  } catch (err) {
    console.error('Admin delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

// שליפת נתונים סטטיסטיים לגרפים
exports.getGraphStats = async (req, res) => {
  try {
    // 1. ממוצע פוסטים לקבוצה לחודש
    const avgPostsPerGroup = await Group.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "group",
          as: "posts",
        },
      },
      {
        $project: {
          groupName: "$name",
          averagePosts: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$posts", []] } }, 0] },
              {
                $divide: [
                  { $size: { $ifNull: ["$posts", []] } },
                  {
                    $max: [
                      1,
                      {
                        $subtract: [
                          { $month: new Date() },
                          { $month: { $min: "$posts.createdAt" } },
                        ],
                      },
                    ],
                  },
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    // 2. משתמשים חדשים לפי חודש
    const newUsersPerMonth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          count: 1,
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 3. טופ 5 יוזרים הכי פעילים
    const topActiveUsers = await User.aggregate([
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          activityScore: {
            $add: [
              { $size: { $ifNull: ["$posts", []] } },
              { $size: { $ifNull: ["$comments", []] } },
            ],
          },
        },
      },
      { $sort: { activityScore: -1 } },
      { $limit: 5 },
    ]);

    // 4. התפלגות קבוצות – פרטיות מול ציבוריות
    const groupTypes = await Group.aggregate([
      {
        $group: {
          _id: "$isPublic",
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          type: {
            $cond: [{ $eq: ["$_id", true] }, "Public", "Private"],
          },
          value: 1,
        },
      },
    ]);

    // 5. פוסטים לפי חודש
    const postsPerMonth = await Post.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" },
            ],
          },
          count: 1,
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      avgPostsPerGroup,
      newUsersPerMonth,
      topActiveUsers,
      groupTypes,
      postsPerMonth,
    });
  } catch (err) {
    console.error("Failed to get graph stats:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
