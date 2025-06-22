// פונקציות שירות

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require("../models/Notification");
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
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

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

// חיפוש משתמשים על פי 3 קטגוריות - שם, גיל, עיר מגורים
exports.searchUsers = async (req, res) => {
  try {
    const { fullName, location, minAge, maxAge } = req.query;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};

    if (fullName) {
      const regex = new RegExp(fullName, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex }
      ];
    }

    if (location) {
      query.location = new RegExp(location, 'i');
    }

    if (minAge || maxAge) {
      const now = new Date();
      const todayYear = now.getFullYear();
      query.dateOfBirth = {};

      if (minAge) {
        const maxBirthYear = todayYear - parseInt(minAge);
        query.dateOfBirth.$lte = new Date(`${maxBirthYear}-12-31`);
      }

      if (maxAge) {
        const minBirthYear = todayYear - parseInt(maxAge);
        query.dateOfBirth.$gte = new Date(`${minBirthYear}-01-01`);
      }
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .skip(skip)
      .limit(limit);

    res.json({ users });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// מחיקת משתמש עצמי
exports.deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Your account has been deleted successfully' });
  } catch (err) {
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

    // מציאת פוסטים ציבוריים מהיוזר, חברים או קבוצות שהוא חבר בהן
    const posts = await Post.find({
      isPublic: true,
      $or: [
        { author: userId },
        { author: { $in: friendIds } },
        { group: { $in: groupIds } }
      ]
    })
      .populate('author', 'firstName lastName imageURL')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('sharedFrom')
      .populate('sharedFrom.author', 'firstName lastName imageURL')
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

// שליפת כל הפוסטים של המשתמש
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    // שליפה עי אדמין או יוצר הפוסטים
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized – not allowed to access other users\' posts' });
    }

    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find({ author: userId })
      .populate('author', 'firstName lastName imageURL')
      .populate('sharedFrom', 'content imageUrl author')
      .populate('sharedFrom.author', 'firstName lastName imageURL')
      .populate('group', 'name')
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
      .populate('group', 'name')
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

  if (senderId === receiverId) return res.status(400).json({ error: 'Cannot friend yourself' });

  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  if (!receiver) return res.status(404).json({ error: 'User not found' });

  if (sender.friendRequestsSent.includes(receiverId) || receiver.friendRequestsReceived.includes(senderId)) {
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
    image: sender.imageURL
  });

  const io = getIO();
  io.to(receiver._id.toString()).emit("receive-notification", notification);

  res.json({ message: 'Friend request sent' });
};

// קבלת בקשות חברות 
exports.acceptFriendRequest = async (req, res) => {
  const userId = req.user.id;
  const senderId = req.params.id;

  const user = await User.findById(userId);
  const sender = await User.findById(senderId);

  if (!user || !sender) return res.status(404).json({ error: 'User not found' });

  if (!user.friendRequestsReceived.includes(senderId)) {
    return res.status(400).json({ error: 'No request found' });
  }

  user.friends.push(senderId);
  sender.friends.push(userId);

  user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id.toString() !== senderId);
  sender.friendRequestsSent = sender.friendRequestsSent.filter(id => id.toString() !== userId);

  await user.save();
  await sender.save();

  res.json({ message: 'Friend request accepted' });
};

// דחיית בקשת חברות
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

// קבוצות שהמשתמש חבר בהן
exports.getMyGroups = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(req.user.id).populate({
      path: 'groups',
      options: { skip, limit }
    });
    res.json(user.groups);
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

// מחזיר רשימת החברים של המשתמש המחובר
exports.getMyFriends = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId)
      .populate("friends", "firstName lastName imageURL")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const friends = user.friends.map((friend) => ({
      id: friend._id,
      name: `${friend.firstName} ${friend.lastName}`,
      imageURL: friend.imageURL,
    }));

    res.json(friends);
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};