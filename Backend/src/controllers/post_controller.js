// פונקציות שירות 

const Post = require('../models/Post');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require("../models/Notification");
const { getIO } = require("../sockets/socket");

// קבלת פוסט לפי מזהה
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName imageURL')
      .populate({
        path: 'sharedFrom',
        populate: {
          path: 'author',
          select: 'firstName lastName imageURL'
        }
      })
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')
      .populate('group', 'name imageURL');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// יצירת פוסט
exports.createPost = async (req, res) => {
  try {
    const { content, group } = req.body;

    // תוצאה סופית
    const postData = {
      content,
      group,
      author: req.user.id,
      isPublic: req.body.isPublic === 'true',
      imageUrls: [],
      videoUrls: []
    };

    // תמונות מרובות
    if (req.files?.images) {
      postData.imageUrls = req.files.images.map(file => file.path);
    }

    // סרטונים מרובים
    if (req.files?.videos) {
      postData.videoUrls = req.files.videos.map(file => file.path);
    }

    const newPost = await Post.create(postData);

    // התראות לחברי הקבוצה
    const groupObj = await Group.findById(group);
    if (groupObj) {
      const author = await User.findById(req.user.id);
      const membersToNotify = groupObj.members.filter(id => id.toString() !== req.user.id);
      const preview = newPost.content.length > 80 ? newPost.content.slice(0, 100) + "..." : newPost.content;

      for (const memberId of membersToNotify) {
        const notification = await Notification.create({
          recipient: memberId,
          sender: groupObj._id,
          type: "group_post",
          message: `${author.fullName} posted in the group "${groupObj.name}": ${preview}`,
          link: `/groups/${groupObj._id}`,
          image: groupObj.imageURL,
          isRead: false,
        });

        // עדכון כמות ההתראות שלא נקראו של המשתמש
        await User.findByIdAndUpdate(memberId, {
          $inc: { unreadNotificationsCount: 1 }
        });

        const io = getIO();
        io.to(memberId.toString()).emit("receive-notification", notification);
      }
    }

    res.status(201).json(newPost);
    } catch (err) {
      console.error("Create post error:", err);
      res.status(500).json({ error: err.message || String(err) });
    }
};

// עריכת פוסט
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (req.body.content) post.content = req.body.content;
    if (req.body.group) post.group = req.body.group;
    if (req.body.isPublic !== undefined) post.isPublic = req.body.isPublic === 'true';

    const removedImages = JSON.parse(req.body.removedImages || "[]");
    const removedVideos = JSON.parse(req.body.removedVideos || "[]");

    if (removedImages.length && Array.isArray(post.imageUrls)) {
      post.imageUrls = post.imageUrls.filter(url => !removedImages.includes(url));
    }
    if (removedVideos.length && Array.isArray(post.videoUrls)) {
      post.videoUrls = post.videoUrls.filter(url => !removedVideos.includes(url));
    }

    if (req.files?.images) {
      const newImages = req.files.images.map(file => file.path);
      post.imageUrls = (post.imageUrls || []).concat(newImages);
    }

    if (req.files?.videos) {
      const newVideos = req.files.videos.map(file => file.path);
      post.videoUrls = (post.videoUrls || []).concat(newVideos);
    }

    post.updatedAt = new Date();
    await post.save();

    res.json(post);
  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).json({ error: err.message || 'Failed to update post' });
  }
};

// מחיקת פוסט כולל ניקוי תלויות (ע"י הבעלים או ע"י אדמין או ע"י יוצר קבוצה)
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isOwner = post.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const groupCreatorCanDelete = async (userId, post) => {
      if (!post.group) return false;
      const group = await Group.findById(post.group);
      return group && group.creator.toString() === userId.toString();
    };
    const isGroupCreator = await groupCreatorCanDelete(req.user.id, post);

    if (!isOwner && !isAdmin && !isGroupCreator) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await User.updateMany({}, { $pull: { savedPosts: postId } });
    await Post.deleteMany({ sharedFrom: postId });
    await post.deleteOne();

    res.json({ message: 'Post and related data deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// חיפוש פוסטים לפי 3 קטגוריות - תוכן, יוצר, תאריך יצירה 
exports.searchPosts = async (req, res) => {
  const { query, text, authorName, fromDate, toDate } = req.query;
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 10;

  const filter = {};

  try {
    // טווח תאריכים
    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate)
      };
    }

    // חיפוש כללי (query) – גם בתוכן וגם בשם היוצר
    if (query) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } }
        ]
      });

      const userIds = users.map(u => u._id);

      filter.$or = [
        { content: { $regex: query, $options: 'i' } },
        { author: { $in: userIds } }
      ];
    }

    // חיפוש ממוקד בתוכן
    if (text) {
      filter.content = { $regex: text, $options: 'i' };
    }

    // חיפוש ממוקד בשם המחבר
    if (authorName) {
      const users = await User.find({
        $or: [
          { firstName: { $regex: authorName, $options: 'i' } },
          { lastName: { $regex: authorName, $options: 'i' } }
        ]
      });
      const userIds = users.map(u => u._id);
      filter.author = { $in: userIds };
    }

    const posts = await Post.find(filter)
      .populate('author', 'firstName lastName imageURL')
      .populate('group', 'name imageURL')
      .populate({
        path: 'sharedFrom',
        select: 'content createdAt author',
        populate: {
          path: 'author',
          select: 'firstName lastName imageURL',
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);

  } catch (err) {
    console.error("Search posts error:", err);
    res.status(500).json({ error: "Failed to search posts" });
  }
};

// שיתוף פוסט - יצירת קישור שיתוף
exports.getShareLink = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const shareLink = `http://localhost:3000/view-shared-post/${post._id}`; // קישור לפרונט
    res.json({ shareLink });

  } catch (err) {
    console.error('Error generating share link:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
};

// צפייה בפוסט ששותף
exports.getSharedPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName _id imageURL')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')
      .populate('group', 'name imageURL isPublic');

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // אם הפוסט פרטי – רק היוצר יכול לראות
    if (!post.isPublic) {
      if (!req.user || !post.author._id.equals(req.user.id)) {
        return res.status(403).json({ error: 'Only the author can view this private post' });
      }
      return res.json(post);
    }

    // אם הפוסט ציבורי - אם שייך לקבוצה פרטית רק חברי הקבוצה יוכלו לראות 
    if (post.group && post.group.isPublic === false) {
      if (!req.user) {
        return res.status(401).json({ error: 'Login required to view this group post' });
      }

      const viewer = await User.findById(req.user.id);
      const isInGroup = viewer.groups.includes(post.group._id);

      if (!isInGroup) {
        return res.status(403).json({ error: 'You are not a member of this private group' });
      }
    }

    return res.json(post);

  } catch (err) {
    console.error('Error fetching shared post:', err);
    res.status(500).json({ error: 'Failed to fetch shared post' });
  }
};

// הפיכת פוסט לציבורי
exports.makePostPublic = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can change visibility' });
    }

    post.isPublic = true;
    await post.save();

    res.json({ message: 'Post is now public' });
  } catch (err) {
    console.error('Error making post public:', err);
    res.status(500).json({ error: 'Failed to update post visibility' });
  }
};

// הפיכת פוסט לפרטי
exports.makePostPrivate = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can change visibility' });
    }

    post.isPublic = false;
    await post.save();

    res.json({ message: 'Post is now private' });
  } catch (err) {
    console.error('Error making post private:', err);
    res.status(500).json({ error: 'Failed to update post visibility' });
  }
};

// הוספה או הסרת לייק
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("author");

    if (!post) return res.status(404).json({ error: "Post not found" });

    const userId = req.user.id;
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // הסרת לייק
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      // הוספת לייק
      post.likes.push(userId);

      // שליחת התראה לבעל הפוסט (אם לא הוא עצמו שם לייק לעצמו)
      if (post.author._id.toString() !== userId) {
        const senderUser = await User.findById(userId);

        const notification = await Notification.create({
          recipient: post.author._id,
          sender: senderUser._id,
          type: "like",
          message: `${senderUser.firstName} ${senderUser.lastName} liked your post`,
          link: `/posts/${post._id}`,
          image: senderUser.imageURL,
          isRead: false,
        });

        // עדכון כמות ההתראות שלא נקראו של המשתמש
        await User.findByIdAndUpdate(post.author._id, {
          $inc: { unreadNotificationsCount: 1 }
        });

        // שליחה בזמן אמת
        const io = getIO();
        io.to(post.author._id.toString()).emit("receive-notification", notification);
      }
    }

    await post.save();

    res.json({
      message: alreadyLiked ? "Like removed" : "Post liked",
      likesCount: post.likes.length,
      likedByMe: !alreadyLiked,
    });

  } catch (err) {
    console.error("Error toggling like:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};

// שליפת כל התגובות לפוסט
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId)
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const totalComments = post.commentCount || post.comments.length;
    const paginatedComments = post.comments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);

    res.json({
      comments: paginatedComments,
      hasMore: skip + limit < totalComments
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// הוספת תגובה לפוסט עם תיוג משתמשים
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { text } = req.body;

    // זיהוי תיוגים מהטקסט
    const taggedUsernames = (text.match(/@(\w+)/g) || []).map(tag => tag.slice(1));
    const mentionedUsers = await User.find({ firstName: { $in: taggedUsernames } });

    const comment = {
      user: req.user.id,
      text,
      mentionedUsers: mentionedUsers.map(user => user._id),
      createdAt: new Date()
    };

    post.comments.push(comment);
    post.commentsCount = (post.commentsCount) + 1;
    await post.save();

    const populated = await Post.findById(post._id)
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')

    const postAuthor = await User.findById(post.author);
    const commenter = await User.findById(req.user.id);
    const preview = text.length > 80 ? text.slice(0, 100) + '...': text;

    // התראה לבעל הפוסט
    if (postAuthor._id.toString() !== commenter._id.toString()) {
      const notification = await Notification.create({
        recipient: postAuthor._id,
        sender: commenter._id,
        type: "comment",
        message: `${commenter.firstName} commented on your post: ${preview}`,
        link: `/posts/${post._id}`,
        image: commenter.imageURL,
        isRead: false,
      });

      // עדכון כמות ההתראות שלא נקראו של המשתמש
      await User.findByIdAndUpdate(postAuthor._id, {
        $inc: { unreadNotificationsCount: 1 }
      });

      const io = getIO();
      io.to(postAuthor._id.toString()).emit("receive-notification", notification);
    }

    res.status(201).json(populated.comments);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

// מחיקת תגובה ע"י יוצר התגובה 
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to delete this comment' });
    }

    post.comments = post.comments.filter(c => c._id.toString() !== commentId);
    post.commentsCount = Math.max((post.commentsCount || 1) - 1, 0); 

    await post.save();
    res.json({ message: 'Comment deleted successfully' });

  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// שיתוף פוסט לפיד של המשתמש או לקבוצה
exports.sharePostToFeed = async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) {
      return res.status(404).json({ error: 'Original post not found' });
    }

    if (originalPost.group) {
      return res.status(403).json({ error: 'You cannot share a group post' });
    }

    const { content, sharedToGroup } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Shared post must include some content' });
    }

    // בדיקה אם המשתמש חבר בקבוצה שאליה משתף
    if (sharedToGroup) {
      const user = await User.findById(req.user.id);
      if (!user.groups.includes(sharedToGroup)) {
        return res.status(403).json({ error: 'You are not a member of this group' });
      }
    }
    
    const newPost = await Post.create({
      content, // התוכן החדש של המשתף
      sharedFrom: originalPost._id,
      sharedToGroup: sharedToGroup || null,
      author: req.user.id,
      isPublic: req.body.isPublic === 'true',
      createdAt: new Date()
    });

    const originalAuthor = await User.findById(originalPost.author);
    const sharingUser = await User.findById(req.user.id);
    const preview = newPost.content.length > 80 ? newPost.content.slice(0, 100) + "..." : newPost.content;

    if (originalAuthor._id.toString() !== sharingUser._id.toString()) {
      const notification = await Notification.create({
        recipient: originalAuthor._id,
        sender: sharingUser._id,
        type: "share",
        message: `${sharingUser.fullName} shared your post: ${preview}`,
        link: `/posts/${originalPost._id}`,
        image: sharingUser.imageURL,
        isRead: false,
      });
      
      // עדכון כמות ההתראות שלא נקראו של המשתמש
      await User.findByIdAndUpdate(originalAuthor._id, {
        $inc: { unreadNotificationsCount: 1 }
      });

      const io = getIO();
      io.to(originalAuthor._id.toString()).emit("receive-notification", notification);
    }

    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error sharing post to feed:', err);
    res.status(500).json({ error: 'Failed to share post to feed' });
  }
};

