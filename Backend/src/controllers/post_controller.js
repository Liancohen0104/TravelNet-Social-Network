// פונקציות שירות 

const Post = require('../models/Post');
const User = require('../models/User');
const Group = require('../models/Group');
const { getIO } = require("../sockets/socket");
const Notification = require("../models/Notification");

// קבלת פוסט לפי מזהה
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName imageURL')
      .populate('sharedFrom')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')
      .populate('sharedFrom.author', 'firstName lastName imageURL');

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
      const preview = newPost.content.length > 100 ? newPost.content.slice(0, 100) + "..." : newPost.content;

      for (const memberId of membersToNotify) {
        const notification = await Notification.create({
          recipient: memberId,
          sender: author._id,
          type: "group_post",
          message: `${author.fullName} posted in the group "${groupObj.name}": ${preview}`,
          link: `/groups/${groupObj._id}/posts`,
          imageURL: author.imageURL
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

// מחיקת פוסט
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.author.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

// חיפוש פוסטים לפי 3 קטגוריות - תוכן, יוצר, תאריך יצירה 
exports.searchPosts = async (req, res) => {
  const { text, fromDate, toDate, authorName } = req.query;
  const skip = parseInt(req.query.skip) || 0;
  const limit = parseInt(req.query.limit) || 10;

  const query = {
    ...(text && { content: { $regex: text, $options: 'i' } }),
    ...(fromDate && toDate && {
      createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    }),
  };

  try {
    if (authorName) {
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: authorName, $options: 'i' } },
          { lastName:  { $regex: authorName, $options: 'i' } }
        ]
      });

      const matchingUserIds = matchingUsers.map(user => user._id);
      query.author = { $in: matchingUserIds };
    }

    const results = await Post.find(query)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(results);

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

// שיתוף פוסט - יצירת קישור שיתוף
exports.getShareLink = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const shareLink = `http://localhost:3000/posts/share/${post._id}`; // קישור לפרונט
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
      .populate('author', 'firstName lastName _id')
      .populate('comments.user', 'firstName lastName imageURL')
      .populate('comments.mentionedUsers', 'firstName lastName imageURL')
      .populate('group'); // כדי לבדוק אם המשתמש חבר בקבוצה

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // אם הפוסט ציבורי – כולם יכולים לראות
    if (post.isPublic) {
      return res.json(post);
    }

    // אם אין משתמש מחובר – חסימה
    if (!req.user) {
      return res.status(401).json({ error: 'Login required to view this post' });
    }

    const viewer = await User.findById(req.user.id);

    const isAuthor = post.author._id.equals(viewer._id);
    const isFriend = viewer.friends.includes(post.author._id);
    const isInGroup = post.group && viewer.groups.includes(post.group._id);

    if (isAuthor || isFriend || isInGroup) {
      return res.json(post);
    }

    return res.status(403).json({ error: 'You do not have permission to view this post' });

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
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user.id;

    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      // הסרת לייק
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      // הוספת לייק
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      message: alreadyLiked ? 'Like removed' : 'Post liked',
      likesCount: post.likes.length,
      likedByMe: !alreadyLiked,
    });

  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
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

    // חיפוש המשתמשים המתויגים לפי שם משתמש
    const mentionedUsers = await User.find({ firstName: { $in: taggedUsernames } });

    const comment = {
      user: req.user.id,
      text,
      mentionedUsers: mentionedUsers.map(user => user._id),
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    const populated = await Post.findById(post._id)
      .populate({
          path: 'comments.user',
          select: 'firstName lastName imageURL'
        })
        .populate({
          path: 'comments.mentionedUsers',
          select: 'firstName lastName imageURL'
        });

    const postAuthor = await User.findById(post.author);
    const commenter = await User.findById(req.user.id);
    const preview = text.length > 100 ? text.slice(0, 100) + "..." : text;

    if (postAuthor._id.toString() !== commenter._id.toString()) {
      const notification = await Notification.create({
        recipient: postAuthor._id,
        sender: commenter._id,
        type: "comment",
        message:`${commenter.firstName} commented on your post: ${preview}`,
        link: `/posts/${post._id}`,
        image: commenter.imageURL
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

    // מוצא את התגובה
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // בודק הרשאה – רק יוצר התגובה יכול למחוק
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to delete this comment' });
    }

    // מסיר את התגובה מהמערך
    post.comments = post.comments.filter(c => c._id.toString() !== commentId);

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
      createdAt: new Date()
    });

    const originalAuthor = await User.findById(originalPost.author);
    const sharingUser = await User.findById(req.user.id);
    const preview = newPost.content.length > 100 ? newPost.content.slice(0, 100) + "..." : newPost.content;

    if (originalAuthor._id.toString() !== sharingUser._id.toString()) {
      const notification = await Notification.create({
        recipient: originalAuthor._id,
        sender: sharingUser._id,
        type: "share",
        message: `${sharingUser.fullName} shared your post: ${preview}`,
        link: `/posts/${originalPost._id}`,
        image: sharingUser.imageURL
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

