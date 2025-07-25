import React, { useRef, useState, useEffect } from "react";
import "../css/CreatePostBox.css";
import "../css/PostCard.css";
import "../css/UserLayout.css";
import { ImageIcon, VideoIcon, SendHorizontal, X, Check } from "lucide-react";
import { createPortal } from "react-dom";
import postApi from "../services/postApi";
import userApi from "../services/usersApi";

export default function CreatePostBox({
  onPostCreated,
  sharedFromId = null,
  isEditMode = false,
  postId = null,
  initialContent = "",
  initialImages = [],
  initialVideos = [],
  initialPrivacy = "Private",
  initialGroupId = null,
  isGroupContext = false,
}) {
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [images, setImages] = useState(initialImages.map(url => ({ url, file: null })));
  const [videos, setVideos] = useState(initialVideos.map(url => ({ url, file: null })));
  const [text, setText] = useState(initialContent);
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [loading, setLoading] = useState(false);
  const [removedImages, setRemovedImages] = useState([]);
  const [removedVideos, setRemovedVideos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGroups, setFilteredGroups] = useState([]);

  useEffect(() => {
    if (isGroupContext && initialGroupId) {
      setSelectedGroupId(initialGroupId);
    }
  }, [isGroupContext, initialGroupId]);

  useEffect(() => {
    if (showGroupsModal && !isGroupContext) {
      userApi.getMyGroups()
        .then((res) => {
          setGroups(res);
          setFilteredGroups(res);
        })
        .catch(() => {
          setGroups([]);
          setFilteredGroups([]);
        });
    }
  }, [showGroupsModal, isGroupContext]);

  const handleSearchGroups = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter((g) =>
        g.name.toLowerCase().includes(query)
      );
      setFilteredGroups(filtered);
    }
  };

  const handleImageClick = () => imageInputRef.current?.click();
  const handleVideoClick = () => videoInputRef.current?.click();

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    const newImages = files.map((file) => ({ url: URL.createObjectURL(file), file }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleVideoChange = (event) => {
    const files = Array.from(event.target.files || []);
    const newVideos = files.map((file) => ({ url: URL.createObjectURL(file), file }));
    setVideos((prev) => [...prev, ...newVideos]);
  };

  const removeImage = (index) => {
    const removed = images[index];
    if (!removed.file) {
      setRemovedImages((prev) => [...prev, removed.url]);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    const removed = videos[index];
    if (!removed.file) {
      setRemovedVideos((prev) => [...prev, removed.url]);
    }
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!text.trim() && !sharedFromId && images.length === 0 && videos.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("content", text);

      if (isGroupContext && selectedGroupId) {
        formData.append("isPublic", "true");
        formData.append("group", selectedGroupId);
      } else {
        formData.append("isPublic", privacy === "Public" ? "true" : "false");
        if (selectedGroupId) {
          formData.append("group", selectedGroupId);
        }
      }

      images.forEach((img) => {
        if (img.file) formData.append("images", img.file);
      });

      videos.forEach((vid) => {
        if (vid.file) formData.append("videos", vid.file);
      });

      if (isEditMode && postId) {
        formData.append("removedImages", JSON.stringify(removedImages));
        formData.append("removedVideos", JSON.stringify(removedVideos));
        await postApi.updatePost(postId, formData);
      } else if (sharedFromId) {
        await postApi.sharePostToFeed(sharedFromId, {
          content: text,
          isPublic: privacy === "Public" ? "true" : "false",
          sharedToGroup: selectedGroupId || null,
        });
      } else {
        await postApi.createPost(formData);
      }

      setText("");
      setImages([]);
      setVideos([]);
      setPrivacy("Private");
      setSelectedGroupId(null);
      setRemovedImages([]);
      setRemovedVideos([]);
      setShowGroupsModal(false);

      if (onPostCreated) onPostCreated();
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
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  return (
    <div className="create-post-container">
      <div className="create-post-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isGroupContext ? (
            <div className="create-post-select disabled">Public</div>
          ) : (
            <select
              className="create-post-select"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
          )}

         {isGroupContext ? (
          <div
            style={{
              backgroundColor: "#f0f2f5",
              border: "1px solid #ccc",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            📢 Shared to Group: {groups.find((g) => g._id === initialGroupId)?.name || "This Group"}
          </div>
        ) : (
          <button
            style={{
              backgroundColor: "#f0f2f5",
              border: "1px solid #ccc",
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "14px",
            }}
            onClick={() => setShowGroupsModal(true)}
          >
            {selectedGroupId
              ? "📢 Share to Group: " + groups.find((g) => g._id === selectedGroupId)?.name
              : "📢 Share to Group"}
          </button>
        )}
        </div>
      </div>

      <textarea
        className="create-post-textarea"
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {!sharedFromId && (
        <div className="media-preview-grid">
          {images.map((img, index) => (
            <div className="media-preview-card" key={`img-${index}`}>
              <img src={img.url} alt={`img-${index}`} />
              <button className="remove-button" onClick={() => removeImage(index)}>
                <X size={16} />
              </button>
            </div>
          ))}
          {videos.map((vid, index) => (
            <div className="media-preview-card" key={`vid-${index}`}>
              <video src={vid.url} controls />
              <button className="remove-button" onClick={() => removeVideo(index)}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="create-post-actions">
        {!sharedFromId && (
          <div className="media-buttons">
            <button className="media-button" onClick={handleImageClick}>
              <ImageIcon size={18} /> Photo
            </button>
            <input
              type="file"
              accept="image/*"
              ref={imageInputRef}
              style={{ display: "none" }}
              onChange={handleImageChange}
              multiple
            />

            <button className="media-button" onClick={handleVideoClick}>
              <VideoIcon size={18} /> Video
            </button>
            <input
              type="file"
              accept="video/*"
              ref={videoInputRef}
              style={{ display: "none" }}
              onChange={handleVideoChange}
              multiple
            />
          </div>
        )}

        <button className="create-post-button" onClick={handlePost} disabled={loading}>
          {loading ? (isEditMode ? "Updating..." : "Posting...") : (
            <>
              {isEditMode ? "Update" : "Post"} <SendHorizontal size={16} />
            </>
          )}
        </button>
      </div>

      {showGroupsModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowGroupsModal(false)}>
          <div className="modal-content messenger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select group to share with</h3>
              <button onClick={() => setShowGroupsModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={handleSearchGroups}
                className="search-input-modal"
                style={{
                  padding: "8px 12px",
                  marginBottom: "12px",
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
              {filteredGroups.map((group) => (
                <div
                  key={group._id}
                  className={`friend-item ${selectedGroupId === group._id ? "selected" : ""}`}
                  onClick={() => handleGroupSelect(group._id)}
                >
                  <img src={group.imageURL} alt="avatar" className="comment-avatar" />
                  <span>{group.name}</span>
                  {selectedGroupId === group._id && <Check className="check-icon" />}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowGroupsModal(false)}
                disabled={!selectedGroupId}
                className="messenger-send-btn"
              >
                Select <SendHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
    {error && <div className="error">{error}</div>}
    </div>
  );
}
