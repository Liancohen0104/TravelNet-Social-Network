import { useEffect, useState } from "react";
import usersApi from "../services/usersApi";
import groupApi from "../services/groupApi";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { FiSearch } from "react-icons/fi";
import { Link } from "react-router-dom";
import { FaPlus, FaTimes} from "react-icons/fa";
import { createPortal } from "react-dom";

export default function GroupsList() {
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const socket = useSocket();
  const { user } = useAuth();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", isPublic: true });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleGroupApproved = () => {
      fetchGroups();
    };

    socket.on("group-join-approved", handleGroupApproved);
    return () => socket.off("group-join-approved", handleGroupApproved);
  }, [socket]);

  const handleCreateGroup = async () => {
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("isPublic", form.isPublic);
    if (selectedImage) formData.append("image", selectedImage);

    try {
      await groupApi.createGroup(formData);
      alert("Group created successfully!");
      setShowCreateGroupModal(false);
      setForm({ name: "", description: "", isPublic: true });
      setSelectedImage(null);
      fetchGroups(); // טען מחדש את הקבוצות
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create group");
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await usersApi.getMyGroups();
      setGroups(res);
    } catch (err) {
      console.error("Failed to load groups", err);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      fetchGroups(); // טוען מחדש את כל הקבוצות אם החיפוש ריק
      return;
    }

    try {
      const res = await usersApi.searchMyGroups(query);
      setGroups(res);
    } catch (err) {
      console.error("Failed to search groups", err);
    }
  };

  return (
    <div className="friends-list">
      <div className="title">
        Groups
        <div className="title-icons">
          <FaPlus onClick={() => setShowCreateGroupModal(true)} />
          <FiSearch onClick={() => setShowSearch((prev) => !prev)}
          />
        </div>
      </div>

      {showSearch && (
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={handleSearch}
          className="search-friends-input"
        />
      )}

      <div className="friends-container">
        {groups.map((group) => (
          <Link
            key={group._id}
            to={`/group/${group._id}`}
            className="friend-item"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="avatar-container">
              <img src={group.imageURL} alt="" className="avatar" />
            </div>
            <div className="info">
              <div className="name">{group.name}</div>
              {group.creator === user?.id && (
                <div className="status">You are the creator</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {showCreateGroupModal && createPortal(
        <div className="comment-modal-overlay" onClick={() => setShowCreateGroupModal(false)}>
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button className="close-btn" onClick={() => setShowCreateGroupModal(false)}><FaTimes /></button>
            </div>

            <div className="modal-content">
              <div className="comments-list">
                {/* תמונה */}
                <div className="form-group" style={{ textAlign: "center" }}>
                  <label htmlFor="createGroupImage" className="image-label">
                    <img
                      src={selectedImage ? URL.createObjectURL(selectedImage) : "https://res.cloudinary.com/druxrfbst/image/upload/v1750453874/default_profile_eqtr4y.jpg"}
                      alt="Preview"
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #ccc",
                        cursor: "pointer",
                      }}
                    />
                  </label>
                  <input
                    type="file"
                    id="createGroupImage"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedImage(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {/* שדות שם ותיאור */}
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {/* פרטיות */}
                <div className="form-group">
                  <label className="form-label">Privacy</label>
                  <select
                    className="form-input"
                    value={form.isPublic}
                    onChange={(e) => setForm({ ...form, isPublic: e.target.value === "true" })}
                  >
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                </div>

                {/* כפתור שמירה */}
                <div className="form-buttons">
                  <button className="save-btn" onClick={handleCreateGroup}>Create Group</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
