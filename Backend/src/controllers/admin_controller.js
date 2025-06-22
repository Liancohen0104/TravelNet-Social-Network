// פונקציות שירות

const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');

// שליפת כל המשתמשים שאינם אדמין
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete users' });
    }

    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// שליפת כל הפוסטים
exports.getAllPosts = async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find()
      .populate('author', 'firstName lastName')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (err) {
    console.error('Admin – get all posts error:', err);
    res.status(500).json({ error: 'Failed to get posts' });
  }
};

// מחיקת פוסט
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Admin – delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// קבלת כל הקבוצות
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate('creator', 'firstName lastName email');
    res.json(groups);
  } catch (err) {
    console.error('Admin get all groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// מחיקת קבוצה ע"י אדמין
exports.deleteGroupByAdmin = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);

    if (!group) return res.status(404).json({ error: 'Group not found' });

    await group.deleteOne();

    res.json({ message: 'Group deleted by admin' });
  } catch (err) {
    console.error('Admin delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};