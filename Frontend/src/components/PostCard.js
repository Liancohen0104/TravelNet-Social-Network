import React, { useState, useEffect, forwardRef, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNow } from "date-fns";
import {
  FaThumbsUp, FaCommentAlt, FaShare, FaTrash, FaTimes,
  FaWhatsapp, FaEnvelope, FaLink, FaFacebookMessenger,
  FaCheck, FaSave, FaTrashAlt, FaLock, FaGlobeAmericas, FaEdit 
} from "react-icons/fa";
import { SendHorizontal } from "lucide-react";
import postApi from "../services/postApi";
import userApi from "../services/usersApi";
import chatApi from "../services/chatApi";
import CreatePostBox from "./CreatePostBox";
import "../css/PostCard.css";
import "../css/UserLayout.css";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const PostCard = forwardRef(({ post, onPostDeleted, onPostUpdated, isInsideGroup=null, onUnsave=null }, ref) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const commentObserver = useRef(null);
  const [newComment, setNewComment] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMessengerModal, setShowMessengerModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  console.log("post",post)

  useEffect(() => {
    const checkSaved = async () => {
      try {
        const saved = await userApi.isPostSaved(post?._id);
        setIsSaved(saved.isSaved);
      } catch (err) {
        console.error("Failed to fetch saved status:", err);
      }
    };

    checkSaved();
  }, [post?._id]);

  const loadComments = async (postId, pageToLoad = commentPage + 1) => {
    if (loadingComments || !hasMoreComments) return;
    setLoadingComments(true);

    try {
      const res = await postApi.getComments(postId, pageToLoad);
      const newComments = res.comments || [];

      if (newComments.length === 0) {
        setHasMoreComments(false);
      } else {
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c?._id));
          const uniqueNew = newComments.filter((c) => !existingIds.has(c?._id));
          return [...prev, ...uniqueNew];
        });

        setCommentPage(pageToLoad); // עדכון מדויק של הדף
        if (newComments.length < 5) setHasMoreComments(false);
      }
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const reloadAllComments = async (postId) => {
    if (commentObserver.current) commentObserver.current.disconnect();
    setLoadingComments(true);
    setComments([]);
    setCommentPage(0);
    setHasMoreComments(true);

    try {
      const res = await postApi.getComments(postId, 1);
      const newComments = res.comments || [];

      setComments(newComments);
      setCommentPage(1);
      if (newComments.length < 10) setHasMoreComments(false);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoadingComments(false);
    }
  };

  const lastCommentRef = useCallback(
    (node) => {
      if (loadingComments) return;
      if (commentObserver.current) commentObserver.current.disconnect();
      commentObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreComments) {
          loadComments(post?._id); 
        }
      });
      if (node) commentObserver.current.observe(node);
    },
    [loadingComments, hasMoreComments, post?._id]
  );

  useEffect(() => {
    if (showComments && post?._id) {
      reloadAllComments(post?._id);
    }
  }, [showComments, post?._id]);

  const handleLike = async () => {
    try {
      await postApi.toggleLike(post?._id);
      setIsLiked((prev) => !prev);
      setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await postApi.addComment(post?._id, newComment.trim());
      const newAddedComment = res[res.length - 1];
      setComments((prev) => [newAddedComment, ...prev]);
      onPostUpdated?.({ ...post, commentsCount: (post.commentsCount || 0) + 1 });
      setNewComment("");
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postApi.deleteComment(post?._id, commentId);
      setComments((prev) => prev.filter((c) => c?._id !== commentId));
      onPostUpdated?.({ ...post, commentsCount: post.commentsCount - 1 });
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      const res = await postApi.getShareLink(post?._id);
      await navigator.clipboard.writeText(res.shareLink);
      alert("Link copied to clipboard");
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleWhatsappShare = async () => {
    try {
      const res = await postApi.getShareLink(post?._id);
      const link = res.shareLink;
      if (!link) throw new Error("No link found in response");

      const message = `Hey! Check out this post I just saw on our travel social network: ${link}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleEmailShare = async () => {
    try {
      const res = await postApi.getShareLink(post?._id);
      const rawLink = res.shareLink || res.link || res.url || res.data?.link || res.data?.url;
      if (!rawLink) throw new Error("No link found");
      const link = `Link to view the post:\n${"\u200E" + rawLink}`;

      const subject = "Check out this post!";
      const body = `Hey there,\n\nI just saw this post on our travel social network and thought you’d like it.\n\n${post.content || ""}\n\n${link}\n\nEnjoy!`;
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const openMessengerModal = async () => {
    try {
      const res = await userApi.getMyFriends();
      setFriends(res || []);
      setShowMessengerModal(true);
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const toggleFriendSelection = (id) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMessengerSend = async () => {
    try {
      if (selectedFriendIds.length === 0) {
        alert("Please select at least one friend.");
        return;
      }

      for (const friendId of selectedFriendIds) {
        const formData = new FormData();
        formData.append("recipientId", friendId);
        const message = `Hey! I wanted to share this post with you:\n\n${post?.content || ""}\n\nhttps://yourdomain.com/posts/${post?._id}`;
        formData.append("text", message);
        await chatApi.sendMessage(formData);
      }

      alert("Message sent!");
      setShowMessengerModal(false);
      setSelectedFriendIds([]);
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleSavePost = async () => {
    try {
      const res = await userApi.toggleSavePost(post?._id);
      const nowSaved = res.saved;

      setIsSaved(nowSaved);
      setShowMenu(false);

      // אם הפוסט בוטל מהמועדפים – נעדכן את ההורה
      if (!nowSaved) {
        onUnsave?.();
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Something went wrong");
    }
  };

  const handleEditPost = () => {
    setShowEditModal(true);
  };

  const handleDeletePost = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;
    try {
      await postApi.deletePost(post?._id);
      alert("Post deleted.");
      onPostDeleted?.(post?._id); 
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleMakePrivate = async () => {
    try {
      await postApi.makePrivate(post?._id);
      alert("Post set to private.");
      setShowMenu(false);
      onPostDeleted?.(post?._id);
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handleMakePublic = async () => {
    try {
      await postApi.makePublic(post?._id);
      alert("Post set to public.");
      setShowMenu(false);
      const updatedPost = { ...post, isPublic: true };
      onPostUpdated?.(updatedPost);
    } catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  const handlePostUpdated = async () => {
    setShowEditModal(false);
    try {
      const updated = await postApi.getPostById(post?._id);
      onPostUpdated?.(updated);
    }catch (err) {
      if (err.responseJSON?.error) {
        setError(err.responseJSON.error);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    }
  };

  return (
    <>
    <div className="post-card" ref={ref}>
      <div className="post-menu-container">
        <button className="menu-button" onClick={() => setShowMenu((prev) => !prev)}>⋯</button>
        {showMenu && (
          <div className="post-dropdown-menu">
           {user.role !== "admin" && <button onClick={handleSavePost}><FaSave /> {isSaved ? "Unsave Post" : "Save Post"}</button>}
           <>
            {(post.author?._id === user?._id) && (
              <>
                <button onClick={handleEditPost}><FaEdit /> Edit Post</button>
                {post.isPublic ? (
                  <button onClick={handleMakePrivate}><FaLock /> Make Private</button>
                ) : (
                  <button onClick={handleMakePublic}><FaGlobeAmericas /> Make Public</button>
                )}
              </>
            )}
            {(
              post.author?._id === user?._id ||
              user.role === "admin" ||
              (post.group?.creator?._id === user?._id)
            ) && (
              <button onClick={handleDeletePost}><FaTrashAlt /> Delete Post</button>
            )}
           </>
          </div>
        )}
      </div>
      {/* אם זה פוסט שמשותף מפוסט אחר */}
      {post.sharedFrom ? (
        <>
          {/* Header של המשתף */}
          <div className="post-header">
            <Link to={`/profile/${post.author?._id}`}>
              <img src={post.author?.imageURL} alt="Avatar" className="post-avatar" />
            </Link>
            <div className="post-info">
              <div className="post-author-name">
                <strong>{post.author?.firstName} {post.author?.lastName}</strong> shared a post
              </div>
              <div className="post-time">
                {formatDistanceToNow(new Date(post?.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* תוכן אישי של המשתף */}
          {post.content && <div className="post-text">{post.content}</div>}

          <hr className="shared-divider" />

          {/* הפוסט המקורי שבתוך השיתוף */}
          <div className="shared-post-box">
            <div className="post-header">
              <Link to={`/profile/${post.sharedFrom?.author?._id}`}>
                <img src={post.sharedFrom?.author?.imageURL} alt="Avatar" className="post-avatar" />
              </Link>
              <div className="post-info">
                <div className="post-author-name">
                  {post.sharedFrom?.author?.firstName} {post.sharedFrom?.author?.lastName}
                </div>
                <div className="post-time">
                 {post.sharedFrom?.createdAt
                  ? formatDistanceToNow(new Date(post.sharedFrom?.createdAt), { addSuffix: true }) : ""}
                </div>
              </div>
            </div>
            {post.sharedFrom?.content && (
              <div className="post-text">{post.sharedFrom?.content}</div>
            )}
            {(post.sharedFrom?.imageUrls?.length > 0 || post.sharedFrom?.videoUrls?.length > 0) && (
              <div className="post-media-grid">
                {post.sharedFrom?.imageUrls?.map((url, i) => (
                  <img key={`img-${i}`} src={url} alt="Post media" className="post-media-item" />
                ))}
                {post.sharedFrom?.videoUrls?.map((url, i) => (
                  <video key={`vid-${i}`} src={url} controls className="post-media-item" />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Header רגיל */}
          <div className="post-header">
            {post.group && !isInsideGroup ? (
              <Link to={`/group/${post.group?._id}`}>
                <img src={post.group?.imageURL} alt="Group avatar" className="post-avatar" />
              </Link>
            ) : (
              <Link to={`/profile/${post.author?._id}`}>
                <img src={post.author?.imageURL} alt="User avatar" className="post-avatar" />
              </Link>
            )}
            
            <div className="post-info">
              {post.group && !isInsideGroup ? (
                <>
                  <div className="post-group-name">{post.group.name}</div>
                  <div className="post-author-name group-author">
                    <Link to={`/profile/${post.author?._id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {post.author?.firstName} {post.author?.lastName}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="post-author-name">
                  {post.author?.firstName} {post.author?.lastName}
                </div>
              )}
              <div className="post-time">
                {formatDistanceToNow(new Date(post?.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          {post.content && <div className="post-text">{post.content}</div>}

          {(post.imageUrls?.length > 0 || post.videoUrls?.length > 0) && (
            <div className="post-media-grid">
              {post.imageUrls?.map((url, i) => (
                <img key={`img-${i}`} src={url} alt="Post media" className="post-media-item" />
              ))}
              {post.videoUrls?.map((url, i) => (
                <video key={`vid-${i}`} src={url} controls className="post-media-item" />
              ))}
            </div>
          )}
        </>
      )}

      {/* Stats */}
      <div className="post-stats">
        <span className="likes-count">{likes} likes</span>
        <span className="comments-count" onClick={() => setShowComments(true)} style={{ cursor: "pointer" }}>
          {post.commentsCount} comments
        </span>
      </div>

      {/* Actions */}
      <div className="post-actions">
        <button className="action-btn" onClick={handleLike}>
          <FaThumbsUp className={`icon ${isLiked ? "liked-icon" : ""}`} />
          <span className={isLiked ? "liked-text" : ""}>Like</span>
        </button>
        <button className="action-btn" onClick={() => setShowComments(true)}>
          <FaCommentAlt className="icon" />
          <span>Comment</span>
        </button>
        <button className="action-btn" onClick={() => setShowShareModal(true)}>
          <FaShare className="icon" />
          <span>Share</span>
        </button>
      </div>
    </div>

      {showComments && createPortal(
        <div className="comment-modal-overlay" onClick={() => setShowComments(false)}>
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Comments</h3>
              <button className="close-btn" onClick={() => setShowComments(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div className="comments-list">
                {comments.map((c, index) => (
                <div
                  key={c?._id}
                  className="comment-item"
                  ref={index === comments.length - 1 ? lastCommentRef : null}>
                  <img src={c.user?.imageURL} alt="Avatar" className="comment-avatar" />
                  <div className="comment-body">
                    <div className="comment-author">
                      <strong>{c.user?.firstName} {c.user?.lastName}</strong>
                    </div>
                    <div className="comment-time">
                      {formatDistanceToNow(new Date(c?.createdAt), { addSuffix: true })}
                    </div>
                    <div className="comment-text">{c.text}</div>
                    {c.user?._id === user?._id && (
                      <button className="delete-comment-btn" onClick={() => handleDeleteComment(c?._id)}>
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!hasMoreComments && !loadingComments && comments.length === 0 && (
                <div className="no-more-comments">No comments yet</div>
              )}
              </div>
              <div className="comment-input-section sticky-input">
                <div className="comment-input-box">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  />
                  <button className="submit-comment-btn" onClick={handleAddComment}>Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showShareModal && createPortal(
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share</h3>
              <button className="close-btn" onClick={() => setShowShareModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              {!isInsideGroup && !post.group && (
                <CreatePostBox sharedFromId={post?._id} onPostCreated={() => setShowShareModal(false)} />
              )}
              <div className="share-buttons">
                <button onClick={handleCopyLink}><FaLink /> Copy Link</button>
                <button onClick={handleWhatsappShare}><FaWhatsapp /> WhatsApp</button>
                <button onClick={handleEmailShare}><FaEnvelope /> Email</button>
                <button onClick={openMessengerModal}><FaFacebookMessenger /> Messenger</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEditModal && createPortal(
        <div className="edit-post-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Post</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <CreatePostBox
                initialContent={post.content}
                initialImages={post.imageUrls}
                initialVideos={post.videoUrls}
                groupId={post.group?._id}
                isEditMode={true}
                postId={post?._id}
                initialPrivacy={post.isPublic ? "Public" : "Private"}
                onPostCreated={handlePostUpdated}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {showMessengerModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowMessengerModal(false)}>
          <div className="modal-content messenger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select friends to share with</h3>
              <button onClick={() => setShowMessengerModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                className="search-input-modal"
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {friends
                .filter((friend) =>
                  friend.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((friend) => (
                  <div
                    key={friend.id}
                    className={`friend-item ${selectedFriendIds.includes(friend.id) ? "selected" : ""}`}
                    onClick={() => toggleFriendSelection(friend.id)}
                  >
                    <img src={friend?.imageURL} alt="avatar" className="comment-avatar" />
                    <span>{friend.name}</span>
                    {selectedFriendIds.includes(friend.id) && <FaCheck className="check-icon" />}
                  </div>
              ))}
            </div>
            <div className="modal-footer">
              <button
                onClick={handleMessengerSend}
                disabled={selectedFriendIds.length === 0}
                className="messenger-send-btn"
                >
                Send <SendHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {error && <div className="error">{error}</div>}
    </>
  );
});

export default PostCard;
