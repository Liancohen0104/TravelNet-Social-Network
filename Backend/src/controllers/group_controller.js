// פונקציות שירות

const Group = require('../models/Group');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require("../models/Notification");
const { getIO } = require("../sockets/socket");

// יצירת קבוצה חדשה
exports.createGroup = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    let imageURL;
    if (req.file && req.file.path) {
      imageURL = req.file.path; 
    }

    const group = await Group.create({
      name,
      description,
      isPublic,
      imageURL,
      creator: req.user.id,
      members: [req.user.id],
    });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { groups: group._id }
    });

    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

// עריכת פרטי קבוצה
exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPublic } = req.body;
    let imageURL;
    
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // רק יוצר הקבוצה יכול לערוך
    if (group.creator.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only the creator can update the group' });

    // עדכון שדות רק אם נשלחו
    group.name = name || group.name;
    group.description = description || group.description;
    if (typeof isPublic === 'boolean') group.isPublic = isPublic;
    group.imageURL = imageURL || group.imageURL;

    if (req.file && req.file.path) {
      group.imageURL = req.file.path;
    }

    await group.save();

    res.json(group);
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

// מחיקת קבוצה
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.creator.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only the creator can delete the group' });

    // הסרת הקבוצה מכל המשתמשים
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
};

// בקשת הצטרפות לקבוצה פרטית
exports.requestToJoinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (req.user.role === "admin") {
      return res.status(403).json({ error: "Admins cannot join groups" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.isPublic) return res.status(400).json({ error: 'This is a public group' });
    if (group.members.includes(userId)) return res.status(400).json({ error: 'Already a member' });
    if (group.pendingRequests.includes(userId)) return res.status(400).json({ error: 'Already requested' });

    group.pendingRequests.push(userId);
    await group.save();

    const groupCreator = await User.findById(group.creator);
    const sender = await User.findById(userId);

    const notification = await Notification.create({
      recipient: groupCreator._id,
      sender: sender._id,
      type: "group_request",
      message: `${sender.fullName} has requested to join your group "${group.name}"`,
      link: `/groups/${group._id}`,
      image: sender.imageURL,
      isRead: false,
    });

    await User.findByIdAndUpdate(groupCreator._id, {
      $inc: { unreadNotificationsCount: 1 }
    });

    const io = getIO();
    io.to(groupCreator._id.toString()).emit("receive-notification", notification);
    io.to(groupCreator._id.toString()).emit("new-group-request");

    res.json({ message: 'Join request sent' });
  } catch (err) {
    console.error("Error in requestToJoinGroup:", err);
    res.status(500).json({ error: 'Failed to request join' });
  }
};

// אישור בקשת הצטרפות (רק ע"י יוצר הקבוצה)
exports.approveJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.user.id) return res.status(403).json({ error: 'Only creator can approve' });

    if (!group.pendingRequests.includes(userId)) {
      return res.status(400).json({ error: 'User did not request to join' });
    }

    group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== userId);
    group.members.push(userId);
    await group.save();

    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: groupId }
    });

    const approvedUser = await User.findById(userId);
    const approver = await User.findById(req.user.id);

    const notification = await Notification.create({
      recipient: approvedUser._id,
      sender: approver._id,
      type: "approved_request",
      message: `You have been approved to join the group "${group.name}"`,
      link: `/groups/${group._id}`,
      image: group.imageURL,
      isRead: false,
    });

    await User.findByIdAndUpdate(approvedUser._id, {
      $inc: { unreadNotificationsCount: 1 }
    });

    const io = getIO();
    io.to(approvedUser._id.toString()).emit("receive-notification", notification);

    // שידור שאושרה בקשת ההצטרפות
    io.to(userId).emit("group-request-approved", { groupId, userId });

    res.json({ message: 'User approved and added to group' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

// סירוב/מחיקת בקשת הצטרפות
exports.rejectJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.creator.toString() !== req.user.id) return res.status(403).json({ error: 'Only creator can reject' });

    group.pendingRequests = group.pendingRequests.filter(id => id.toString() !== userId);
    await group.save();

    const io = getIO();
    io.to(userId).emit("group-request-declined", { groupId, userId });

    res.json({ message: 'Join request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

// הצטרפות מיידית לקבוצה ציבורית
exports.joinPublicGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (req.user.role === "admin") {
      return res.status(403).json({ error: "Admins cannot join groups" });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.isPublic) return res.status(400).json({ error: 'This group is private' });
    if (group.members.includes(userId)) return res.status(400).json({ error: 'Already a member' });

    group.members.push(userId);
    await group.save();

    await User.findByIdAndUpdate(userId, {
      $addToSet: { groups: groupId }
    });

    res.json({ message: 'Joined group successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
  }
};

// עזיבת קבוצה
exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // אם המשתמש הוא היוצר - לא ניתן לצאת
    if (group.creator.toString() === userId)
      return res.status(400).json({ error: 'Group creator cannot leave the group' });

    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { groups: groupId }
    });
    
    res.json({ message: 'Left group successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave group' });
  }
};

// פרטי קבוצה
exports.getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('creator', 'firstName lastName');
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    console.error('Get group details error:', err);
    res.status(500).json({ error: 'Failed to fetch group details' });
  }
};

// חברי קבוצה
exports.getGroupMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    const group = await Group.findById(req.params.groupId).populate('members', 'firstName lastName imageURL');

    if (!group) return res.status(404).json({ error: 'Group not found' });

    // אם הקבוצה פרטית, המשתמש לא חבר בה ואינו אדמין – חסום גישה
    const isMember = group.members.some(member => member._id.toString() === userId);
    if (!group.isPublic && !isMember && !isAdmin) {
      return res.status(403).json({ error: 'Access denied – not a group member' });
    }

    res.json(group.members);
  } catch (err) {
    console.error('Get group members error:', err);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
};

// פיד קבוצה - פוסטים של חברי הקבוצה
exports.getGroupPosts = async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isAdmin = req.user.role === 'admin';

    // אם הקבוצה פרטית והמשתמש לא חבר ואינו אדמין – חסום
    if (!group.isPublic && !group.members.includes(req.user.id) && !isAdmin) {
      return res.status(403).json({ error: 'Access denied – not a group member' });
    }

    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find({ group: groupId })
      .populate('author', 'firstName lastName imageURL')
      .populate('sharedFrom', 'content imageUrl author createdAt')
      .populate('sharedFrom.author', 'firstName lastName imageURL')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (err) {
    console.error('Get group posts error:', err);
    res.status(500).json({ error: 'Failed to fetch group posts' });
  }
};

// חיפוש קבוצות לפי שם תיאור וציבורי או פרטי
exports.searchGroups = async (req, res) => {
  try {
    const { query, name, description, isPublic } = req.query;
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;

    const filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ];
    }

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (description) {
      filter.description = { $regex: description, $options: "i" };
    }

    if (isPublic === "true" || isPublic === "false") {
      filter.isPublic = isPublic === "true";
    }

    const groups = await Group.find(filter)
      .select("name description imageURL isPublic members")
      .skip(skip)
      .limit(limit);

    res.json(groups);
  } catch (err) {
    console.error("Search groups error:", err);
    res.status(500).json({ error: "Failed to search groups" });
  }
};
