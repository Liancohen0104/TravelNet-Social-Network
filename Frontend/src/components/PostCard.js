// PostCard.jsx
import React, { useState, useEffect, forwardRef } from "react";
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
import { useAuth } from "../contexts/AuthContext";

const PostCard = forwardRef(({ post, onPostDeleted, onPostUpdated }, ref) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMessengerModal, setShowMessengerModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const res = await userApi.isPostLiked(post._id);
        setIsLiked(res.liked);
      } catch (err) {
        console.error("Error checking like status:", err);
      }
    };
    checkIfLiked();
  }, [post._id]);

  const handleLike = async () => {
    try {
      await postApi.toggleLike(post._id);
      setIsLiked((prev) => !prev);
      setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const updatedComments = await postApi.addComment(post._id, newComment.trim());
      setComments(updatedComments);
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postApi.deleteComment(post._id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleCopyLink = async () => {
    try {
      const res = await postApi.getShareLink(post._id);
      await navigator.clipboard.writeText(res.shareLink);
      alert("Link copied to clipboard");
    } catch (err) {
      console.error("Error copying link:", err);
    }
  };

  const handleWhatsappShare = async () => {
    try {
      const res = await postApi.getShareLink(post._id);
      const link = res.shareLink;
      if (!link) throw new Error("No link found in response");

      const message = `Hey! Check out this post I just saw on our travel social network: ${link}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      console.error("Error sharing via WhatsApp:", err);
      alert("Failed to share the post via WhatsApp.");
    }
  };

  const handleEmailShare = async () => {
    try {
      const res = await postApi.getShareLink(post._id);
      const rawLink = res.shareLink || res.link || res.url || res.data?.link || res.data?.url;
      if (!rawLink) throw new Error("No link found");
      const link = `Link to view the post:\n${"\u200E" + rawLink}`;

      const subject = "Check out this post!";
      const body = `Hey there,\n\nI just saw this post on our travel social network and thought you’d like it.\n\n${post.content || ""}\n\n${link}\n\nEnjoy!`;
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    } catch (err) {
      console.error("Error sharing via email:", err);
      alert("Could not share post via email.");
    }
  };

  const openMessengerModal = async () => {
    try {
      const res = await userApi.getMyFriends();
      setFriends(res || []);
      setShowMessengerModal(true);
    } catch (err) {
      console.error("Failed to load friends list", err);
      alert("Could not load friends");
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
        const message = `Hey! I wanted to share this post with you:\n\n${post.content || ""}\n\nhttps://yourdomain.com/posts/${post._id}`;
        formData.append("text", message);
        await chatApi.sendMessage(formData);
      }

      alert("Message sent!");
      setShowMessengerModal(false);
      setSelectedFriendIds([]);
    } catch (err) {
      console.error("Messenger share failed:", err);
      alert("Failed to send message.");
    }
  };

  const handleSavePost = async () => {
    try {
      await userApi.toggleSavePost(post._id);
      alert("Post saved successfully!");
      setShowMenu(false);
    } catch (err) {
      console.error("Error saving post:", err);
      alert("Failed to save post.");
    }
  };

  const handleEditPost = () => {
    setShowEditModal(true);
  };

  const handleDeletePost = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;
    try {
      await postApi.deletePost(post._id);
      alert("Post deleted.");
      onPostDeleted?.(post._id); 
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  const handleMakePrivate = async () => {
    try {
      await postApi.makePrivate(post._id);
      alert("Post set to private.");
      setShowMenu(false);
      onPostDeleted?.(post._id);
    } catch (err) {
      console.error("Error making post private:", err);
      alert("Failed to update post visibility.");
    }
  };

  const handleMakePublic = async () => {
    try {
      await postApi.makePublic(post._id);
      alert("Post set to public.");
      setShowMenu(false);
      const updatedPost = { ...post, isPublic: true };
      onPostUpdated?.(updatedPost);
    } catch (err) {
      console.error("Error making post public:", err);
      alert("Failed to update post visibility.");
    }
  };

  const handlePostUpdated = async () => {
    setShowEditModal(false);
    try {
      const updated = await postApi.getPostById(post._id);
      onPostUpdated?.(updated);
    } catch (err) {
      console.error("Failed to fetch updated post:", err);
      alert("Post updated, but failed to refresh content.");
    }
  };

  return (
    <>
      <div className="post-card" ref={ref}>
        <div className="post-header">
          <img src={post.group ? post.group.imageURL : post.author.imageURL} alt="avatar" className="post-avatar" />
          <div className="post-menu-container">
            <button className="menu-button" onClick={() => setShowMenu((prev) => !prev)}>⋯</button>
            {showMenu && (
              <div className="post-dropdown-menu">
                <button onClick={handleSavePost}><FaSave /> Save Post</button>
                {post.author._id === user._id && (
                  <>
                    <button onClick={handleEditPost}><FaEdit /> Edit Post</button>
                    <button onClick={handleDeletePost}><FaTrashAlt /> Delete Post</button>
                    {post.isPublic ? (
                      <button onClick={handleMakePrivate}><FaLock /> Make Private</button>
                    ) : (
                      <button onClick={handleMakePublic}><FaGlobeAmericas /> Make Public</button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="post-info">
            {post.group ? (
              <>
                <div className="post-group-name">{post.group.name}</div>
                <div className="post-author-name group-author">
                  {post.author.firstName} {post.author.lastName}
                </div>
              </>
            ) : (
              <div className="post-author-name">
                {post.author.firstName} {post.author.lastName}
              </div>
            )}
            <div className="post-time">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>

        {post.content && <div className="post-text">{post.content}</div>}

        {(post.imageUrls?.length > 0 || post.videoUrls?.length > 0) && (
          <div className="post-media-grid">
            {post.imageUrls.map((url, i) => (
              <img key={`img-${i}`} src={url} alt="Post media" className="post-media-item" />
            ))}
            {post.videoUrls.map((url, i) => (
              <video key={`vid-${i}`} src={url} controls className="post-media-item" />
            ))}
          </div>
        )}

        <div className="post-stats">
          <span className="likes-count">{likes} likes</span>
          <span className="comments-count" onClick={() => setShowComments(true)} style={{ cursor: "pointer" }}>
            {comments.length} comments
          </span>
        </div>

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
                {comments.map((c) => (
                  <div key={c._id} className="comment-item">
                    <img src={c.user.imageURL} alt="Avatar" className="comment-avatar" />
                    <div className="comment-body">
                      <div className="comment-author">
                        <strong>{c.user.firstName} {c.user.lastName}</strong>
                      </div>
                      <div className="comment-time">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </div>
                      <div className="comment-text">{c.text}</div>
                      {c.user._id === user._id && (
                        <button className="delete-comment-btn" onClick={() => handleDeleteComment(c._id)}>
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
              <CreatePostBox sharedFromId={post._id} onPostCreated={() => setShowShareModal(false)} />
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
                postId={post._id}
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
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className={`friend-item ${selectedFriendIds.includes(friend.id) ? "selected" : ""}`}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <img src={friend.imageURL} alt="avatar" className="comment-avatar" />
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
    </>
  );
});

export default PostCard;
