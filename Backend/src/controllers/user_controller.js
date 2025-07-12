// פונקציות שירות

const jwt = require('jsonwebtoken');
const Notification = require("../models/Notification");
const User = require("../models/User");
const Post = require("../models/Post");
const Conversation = require("../models/Conversation");
const Chat = require("../models/Chat");
const Group = require("../models/Group");

const { sendPasswordResetEmail, sendWelcomeEmail  } = require('../services/email_service');
const { getIO } = require("../sockets/socket");

// הפקת תוקן
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// הרשמה
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      location,
      bio
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    let imageURL = undefined;
    if (req.file && req.file.path) {
      imageURL = req.file.path;
    }

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
      imageURL,
      dateOfBirth,
      location,
      bio
    });

    await sendWelcomeEmail(email, `${firstName} ${lastName}`);

    const token = signToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        imageURL: newUser.imageURL,
        location: newUser.location,
        bio: newUser.bio,
        dateOfBirth: newUser.dateOfBirth,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// התחברות
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    user.lastLogin = new Date();
    user.is_online = true;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        imageURL: user.imageURL,
        location: user.location,
        bio: user.bio,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// שכחתי סיסמא
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ error: 'No account registered with this email' });

    const token = user.generatePasswordReset();
    await user.save({ validateBeforeSave: false });

    // שלח מייל אמיתי
    await sendPasswordResetEmail(email, token);

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// איפוס סיסמא
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword)
      return res.status(400).json({ error: 'Missing token or passwords' });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ error: 'Passwords do not match' });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user)
      return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// עדכון פרופיל
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      lastName,
      bio,
      location,
      dateOfBirth,
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth.trim() === "" ? null : dateOfBirth;
    }

    // אם הועלתה תמונת פרופיל חדשה
    if (req.file && req.file.path) {
      user.imageURL = req.file.path;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New passwords do not match' });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        imageURL: user.imageURL,
        bio: user.bio,
        location: user.location,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// שליפת פרטי משתמש מחובר
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// חיפוש משתמשים על פי חיפוש כללי או קטגוריות - שם, גיל, עיר מגורים
exports.searchUsers = async (req, res) => {
  try {
    const { query, fullName, location, minAge, maxAge } = req.query;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const search = {
      role: { $ne: "admin" },
    };

    // חיפוש כללי
    if (query && query.trim() !== "") {
      const regex = new RegExp(query.trim(), 'i');
      search.$or = [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex },
        { location: regex }
      ];
    }

    // חיפוש ממוקד לפי פילטרים
    if (fullName && fullName.trim() !== "") {
      const regex = new RegExp(fullName.trim(), 'i');
      search.$or = [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex }
      ];
    }

    if (location && location.trim() !== "") {
      search.location = new RegExp(location.trim(), 'i');
    }

    if (minAge || maxAge) {
      const now = new Date();
      const year = now.getFullYear();
      search.dateOfBirth = {};

      if (minAge) {
        const maxBirthYear = year - parseInt(minAge);
        search.dateOfBirth.$lte = new Date(`${maxBirthYear}-12-31`);
      }

      if (maxAge) {
        const minBirthYear = year - parseInt(maxAge);
        search.dateOfBirth.$gte = new Date(`${minBirthYear}-01-01`);
      }
    }

    const users = await User.find(search)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .skip(skip)
      .limit(limit);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// חיפוש חברים שלי
exports.searchMyFriends = async (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  try {
    const me = await User.findById(userId).populate(
      "friends",
      "firstName lastName imageURL is_online lastLogin"
    );
    if (!me) return res.status(404).json({ error: "User not found" });

    const filtered = me.friends.filter((friend) => {
      const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
      return fullName.includes((query || "").toLowerCase());
    });

    res.json(
      filtered.map((f) => ({
        id: f._id,
        name: `${f.firstName} ${f.lastName}`,
        imageURL: f.imageURL,
        is_online: f.is_online,
        lastLogin: f.lastLogin,
      }))
    );
  } catch (err) {
    console.error("Error in searchMyFriends:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// חיפוש קבוצות שלי
exports.searchMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    const groups = await Group.find({
      $and: [
        { name: { $regex: query, $options: "i" } },
        {
          $or: [
            { creator: userId },
            { members: userId }
          ]
        }
      ]
    }).select("name imageURL creator");

    res.json(groups);
  } catch (err) {
    console.error("Failed to search my groups:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// מחיקת המשתמש שלי
exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;

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

    // 6. הסרת המשתמש מכל רשימות:
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
          pendingMembers: userId,
          invitedUsers: userId
        }
      }
    );

    res.json({ message: "Your account has been deleted successfully" });

  } catch (err) {
    console.error("Failed to delete account:", err);
    res.status(500).json({ error: err.message });
  }
};

// קבלת פיד אישי של המשתמש – פוסטים ציבוריים מהמשתמש, חברים וקבוצות
exports.getPersonalFeed = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const userId = req.user.id;

    // שליפת המשתמש עם חברים וקבוצות
    const user = await User.findById(userId)
      .populate('friends', '_id')
      .populate('groups', '_id');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const friendIds = user.friends?.map(friend => friend._id) || [];
    const groupIds = user.groups?.map(group => group._id) || [];

    // בניית תנאי OR
    const conditions = [
      { author: userId },                       // פוסטים שלי
      { author: { $in: friendIds } },          // פוסטים של חברים
      { group: { $in: groupIds } },            // פוסטים מקבוצות
      {
        // שיתופים – רק אם המשתף הוא אני או חבר שלי
        sharedFrom: { $ne: null },
        author: { $in: [userId, ...friendIds] }
      }
    ];

    const posts = await Post.find({
      isPublic: true,
      $or: conditions
    })
      .populate('author', 'firstName lastName imageURL')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate({
        path: 'sharedFrom',
        select: 'content author imageUrls videoUrls createdAt',
        populate: {
          path: 'author',
          select: 'firstName lastName imageURL'
        }
      })
      .populate('group', 'name imageURL')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(posts);

  } catch (err) {
    console.error('Public feed error:', err);
    res.status(500).json({ error: 'Failed to load personal feed' });
  }
};

// שליפת כל הפוסטים של משתמש
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const isOwner = req.user.id === userId;

    // תנאי חיפוש: אם הבעלים – כל הפוסטים, אם לא – רק ציבוריים
    const query = { author: userId };
    if (!isOwner) {
      query.isPublic = true;
    }

    const posts = await Post.find(query)
      .populate('author', 'firstName lastName imageURL')
      .populate({
        path: 'sharedFrom',
        select: 'content imageUrls author createdAt',
        populate: {
          path: 'author',
          select: 'firstName lastName imageURL'
        }
      })
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('group', 'name imageURL')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);

  } catch (err) {
    console.error('Error getting user posts:', err);
    res.status(500).json({ error: 'Failed to load user posts' });
  }
};

// הוספה או הסרת פוסט שמור
exports.toggleSavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const postId = req.params.id;

    const isSaved = user.savedPosts.includes(postId);

    if (isSaved) {
      // הסרה מהשמורים
      user.savedPosts = user.savedPosts.filter(
        savedId => savedId.toString() !== postId
      );
    } else {
      // הוספה לשמורים
      user.savedPosts.push(postId);
    }

    await user.save();

    res.json({
      message: isSaved ? 'Post unsaved' : 'Post saved',
      saved: !isSaved
    });
  } catch (err) {
    console.error('Toggle save post error:', err);
    res.status(500).json({ error: 'Failed to toggle saved post' });
  }
};

// שליפת פוסטים שמורים של המשתמש
exports.getSavedPosts = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const user = await User.findById(req.user.id);

    const posts = await Post.find({ _id: { $in: user.savedPosts } })
      .populate('author', 'firstName lastName imageURL')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('group', 'name imageURL')
      .populate({
        path: 'sharedFrom',
        populate: { path: 'author', select: 'firstName lastName imageURL' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (err) {
    console.error('Get saved posts error:', err);
    res.status(500).json({ error: 'Failed to get saved posts' });
  }
};

// שליחת בקשת חברות
exports.sendFriendRequest = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.id;

  if (req.user.role === "admin") {
    return res.status(403).json({ error: "Admins cannot send friend requests" });
  }

  if (senderId === receiverId) return res.status(400).json({ error: 'Cannot friend yourself' });

  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  if (!receiver) return res.status(404).json({ error: 'User not found' });

  if (
    sender.friendRequestsSent.includes(receiverId) ||
    receiver.friendRequestsReceived.includes(senderId)
  ) {
    return res.status(400).json({ error: 'Request already sent' });
  }

  sender.friendRequestsSent.push(receiverId);
  receiver.friendRequestsReceived.push(senderId);

  await sender.save();
  await receiver.save();

  const notification = await Notification.create({
    recipient: receiver._id,
    sender: sender._id,
    type: "friend_request",
    message: `${sender.fullName} sent you a friend request`,
    link: `/users/${sender._id}`,
    image: sender.imageURL,
    isRead: false,
  });

  await User.findByIdAndUpdate(receiver._id, {
    $inc: { unreadNotificationsCount: 1 }
  });

  const io = getIO();
  io.to(receiver._id.toString()).emit("receive-notification", notification);
  io.to(receiver._id.toString()).emit("new-friend-request");

  res.json({ message: "Friend request sent" });
};

// קבלת בקשת חברות 
exports.acceptFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const senderId = req.params.id;

  const user = await User.findById(userId);
  const sender = await User.findById(senderId);

  if (!user || !sender) return res.status(404).json({ error: 'User not found' });

  if (!user.friendRequestsReceived.includes(senderId)) {
    return res.status(400).json({ error: 'No request found' });
  }

  // עדכון חברים
  user.friends.push(senderId);
  sender.friends.push(userId);

  // הסרת בקשות
  user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId);
  sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId);

  await user.save();
  await sender.save();

  // יצירת התראה חדשה
  const notification = await Notification.create({
    recipient: senderId,
    sender: userId,
    type: "friend_approved",
    message: `${user.firstName} ${user.lastName} accepted your friend request`,
    link: `/profile/${userId}`,
    image: user.imageURL,
    isRead: false,
  });

  await User.findByIdAndUpdate(senderId, {
    $inc: { unreadNotificationsCount: 1 }
  });

  const io = getIO();
  io.to(userId.toString()).emit("friend-request-accepted");
  io.to(senderId.toString()).emit("friend-request-accepted");

  // שליחת ההתראה
  io.to(senderId.toString()).emit("receive-notification", notification);

  res.json({ message: 'Friend request accepted' });
};

// מחיקת בקשת חברות
exports.declineFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const senderId = req.params.id;

  const user = await User.findById(userId);
  const sender = await User.findById(senderId);

  if (!user || !sender) return res.status(404).json({ error: 'User not found' });

  user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId);
  sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId);

  await user.save();
  await sender.save();

  const io = getIO();
  io.to(senderId.toString()).emit("friend-request-declined"); 

  res.json({ message: 'Friend request declined' });
};

// הסרת חברות בין משתמשים
exports.unfriendUser = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.targetUserId;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // הסרה דו־כיוונית מרשימת החברים
    currentUser.friends = currentUser.friends.filter(
      (friendId) => friendId.toString() !== targetUserId
    );
    targetUser.friends = targetUser.friends.filter(
      (friendId) => friendId.toString() !== currentUserId
    );

    await currentUser.save();
    await targetUser.save();

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error("Error unfriending user:", err);
    res.status(500).json({ error: "Failed to unfriend user" });
  }
};

// קבלת בקשות חברות ממתינות
exports.getPendingRequests = async (req, res) => {
  const user = await User.findById(req.user.id).populate('friendRequestsReceived', 'firstName lastName imageURL');
  res.json(user.friendRequestsReceived);
};

// קבוצות שהמשתמש חבר בהן - הקבוצות שהוא יצר מופיעות ראשונות
exports.getMyGroups = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(req.user.id).populate({
      path: 'groups',
      select: 'name imageURL creator',
      populate: {
        path: 'creator',
        select: '_id firstName lastName'
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // מיון: קודם קבוצות שהוא יצר
    const sortedGroups = user.groups.sort((a, b) => {
      const aIsCreator = a.creator?._id?.toString() === req.user.id;
      const bIsCreator = b.creator?._id?.toString() === req.user.id;
      return aIsCreator === bIsCreator ? 0 : aIsCreator ? -1 : 1;
    });

    // החזר את העמוד הרצוי לפי skip ו-limit
    const paginatedGroups = sortedGroups.slice(skip, skip + limit);

    res.json(paginatedGroups);
  } catch (err) {
    console.error('Get my groups error:', err);
    res.status(500).json({ error: 'Failed to fetch user groups' });
  }
};

// בדיקת האם המשתמש אהב פוסט
exports.didUserLikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const liked = post.likes.includes(userId);
    res.json({ liked });
  } catch (err) {
    console.error("Error checking like:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// מחזיר רשימת החברים של המשתמש המחובר (ממוינת: מחוברים בראש)
exports.getMyFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId)
      .populate("friends", "firstName lastName imageURL is_online lastLogin")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friends = user.friends
      .map((friend) => ({
        id: friend._id,
        name: `${friend.firstName} ${friend.lastName}`,
        imageURL: friend.imageURL,
        is_online: friend.is_online ?? false,
        lastLogin: friend.lastLogin
      }))
      .sort((a, b) => {
        // מחוברים בראש
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return 0; // אין שינוי אם שניהם באותו סטטוס
      });

    res.json(friends);
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};

// שליפת כל הבקשות הממתינות לקבוצות שנוצרו ע"י המשתמש
exports.getMyGroupsPendingRequests = async (req, res) => {
  try {
    const myGroups = await Group.find({ creator: req.user.id })
      .populate({
        path: "pendingRequests",
        select: "firstName lastName imageURL",
      });

    const results = myGroups
      .filter(group => group.pendingRequests.length > 0)
      .flatMap(group =>
        group.pendingRequests.map(user => ({
          groupId: group._id,
          groupName: group.name,
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageURL: user.imageURL
        }))
      );

    res.json(results);
  } catch (err) {
    console.error("Failed to get pending requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// קבלת כמות ההודעות שלא נקראו
exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    // חישוב כמה הודעות התקבלו ע"י המשתמש ועדיין לא נקראו
    const unreadCount = await Chat.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.json({ unreadMessages: unreadCount });
  } catch (err) {
    console.error("Failed to get unread messages count", err);
    res.status(500).json({ error: "Server error" });
  }
};

// קבלת משתמש לפי מזהה
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// קבלת סטטוס חברות - לא חבר, מחכה לאישור, חבר
exports.getFriendStatus = async (req, res) => {
  const currentUserId = req.user.id;
  const otherUserId = req.params.id;

  if (currentUserId === otherUserId) {
    return res.json({ status: "self" });
  }

  const currentUser = await User.findById(currentUserId);
  const otherUser = await User.findById(otherUserId);

  if (!currentUser || !otherUser) {
    return res.status(404).json({ error: "User not found" });
  }

  if (currentUser.friends.includes(otherUserId)) {
    return res.json({ status: "friends" });
  }

  if (currentUser.friendRequestsSent.includes(otherUserId)) {
    return res.json({ status: "pending" });
  }

  return res.json({ status: "none" });
};

// האם פוסט שמור 
exports.isPostSaved = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const isSaved = user.savedPosts.includes(req.params.postId);
    res.json({ isSaved });
  } catch (err) {
    console.error("Failed to check saved status:", err);
    res.status(500).json({ error: "Failed to check saved status" });
  }
};
