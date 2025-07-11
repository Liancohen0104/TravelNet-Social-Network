import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FaUsers,
  FaTrashAlt,
  FaRegEdit,
  FaUserFriends,
  FaGlobeAmericas,
  FaLock,
  FaTimes,
} from "react-icons/fa";
import groupApi from "../services/groupApi";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import "../css/Profile.css";
import { Link } from "react-router-dom";
import Feed from "../components/Feed";

export default function GroupProfilePage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const socket = useSocket();
  const [group, setGroup] = useState(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [membershipStatus, setMembershipStatus] = useState("loading"); // 'none' | 'pending' | 'member'

  const isCreator = user && group && user._id === group.creator._id;
  const isMember = group?.members?.includes(user?._id);
  const canViewMembers = group?.isPublic || isMember || user.role === "admin";

  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublic: true,
  });

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await groupApi.getGroupDetails(groupId);
        setGroup(res);
      } catch (err) {
        alert(err.response?.data?.error || "Failed to load group");
      }
    }
    fetchGroup();
  }, [groupId]);

  useEffect(() => {
    async function fetchStatus() {
      if (!user || !groupId || isCreator) return;
      try {
        if (group.members.includes(user._id)) {
            setMembershipStatus("member");
        } else if (group.pendingRequests.includes(user._id)) {
            setMembershipStatus("pending");
        } else {
            setMembershipStatus("none");
        }
      } catch (err) {
        setMembershipStatus("none");
      }
    }
    fetchStatus();
  }, [groupId, user, isCreator]);

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleApproved = (data) => {
      if (data.groupId === groupId && data.userId === user._id) {
        setMembershipStatus("member");
      }
    };

    const handleDeclined = (data) => {
      if (data.groupId === groupId && data.userId === user._id) {
        setMembershipStatus("none");
      }
    };

    socket.on("group-request-approved", handleApproved);
    socket.on("group-request-declined", handleDeclined);

    return () => {
      socket.off("group-request-approved", handleApproved);
      socket.off("group-request-declined", handleDeclined);
    };
  }, [socket, groupId, user?._id]);

  const handleJoin = async () => {
    try {
      if (group.isPublic) {
        await groupApi.joinPublicGroup(groupId);
        setMembershipStatus("member");
      } else {
        await groupApi.requestToJoinGroup(groupId);
        setMembershipStatus("pending");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to join group");
    }
  };

  const handleLeave = async () => {
    try {
      await groupApi.leaveGroup(groupId);
      setMembershipStatus("none");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to leave group");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await groupApi.deleteGroup(groupId);
      alert("Group deleted");
      window.location.href = "/";
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete group");
    }
  };

  const handleOpenMembers = async () => {
    try {
      const res = await groupApi.getGroupMembers(groupId);
      setMembers(res);
      setShowMembersModal(true);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to load members");
    }
  };

  const openEditModal = () => {
    setForm({
      name: group?.name || "",
      description: group?.description || "",
      isPublic: group?.isPublic,
    });
    setSelectedImage(null);
    setShowEdit(true);
  };

  const handleEditProfile = async () => {
    const formData = new FormData();
    for (let key in form) {
      if (form[key] !== undefined && form[key] !== null) {
        formData.append(key, form[key]);
      }
    }

    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    try {
      await groupApi.updateGroup(groupId, formData);
      alert("Group updated!");
      setShowEdit(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating group");
    }
  };

  if (!group) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-top">
        <div className="profile-action-buttons">
          {canViewMembers && (
            <button className="saved-posts-icon" onClick={handleOpenMembers}>
              <FaUserFriends />
            </button>
          )}
          {isCreator && (
            <button className="edit-profile-icon" onClick={openEditModal}>
              <FaRegEdit />
            </button>
          )}
          {isCreator && (
            <button className="delete-profile-icon" onClick={handleDeleteGroup}>
              <FaTrashAlt />
            </button>
          )}
        </div>

        <div className="profile-header-row">
          <div className="profile-avatar">
            <div className="avatar-wrapper-profile">
              <img src={group.imageURL} alt="Group" />
              <div className="privacy-overlay-icon">
                {group.isPublic ? <FaGlobeAmericas /> : <FaLock />}
              </div>
            </div>
          </div>

          <div className="profile-main-info">
            <h2 className="profile-name">{group.name}</h2>
            <div className="friends-count">{group.members.length} Members</div>
          </div>
        </div>

        <div className="profile-bottom-section">
          {group.description && (
            <div className="about-item">
              <FaUsers /> {group.description}
            </div>
          )}

          {!isCreator && membershipStatus !== "loading" && (
            <div className="friend-action-container">
              {membershipStatus === "none" && user?.role !== "admin" && (
                <button className="friend-btn" onClick={handleJoin}>Join Group</button>
              )}
              {membershipStatus === "pending" && (
                <button className="friend-btn pending" disabled>Pending...</button>
              )}
              {membershipStatus === "member" && (
                <button className="friend-btn remove" onClick={handleLeave}>Leave Group</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="profile-bottom">
        {group.isPublic && <Feed groupId={groupId} />}
        {!group.isPublic && (isMember || user?.role === "admin") && <Feed groupId={groupId} canCreatePost={isMember} />}
      </div>

      {/* מודל עריכת קבוצה */}
      {showEdit && createPortal(
        <div className="comment-modal-overlay" onClick={() => setShowEdit(false)}>
            <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Edit Group</h3>
                <button className="close-btn" onClick={() => setShowEdit(false)}><FaTimes /></button>
            </div>

            <div className="modal-content">
                <div className="comments-list">
                {/* תמונה + העלאה */}
                <div className="form-group" style={{ textAlign: "center" }}>
                    <label htmlFor="groupImageUpload" className="image-label">
                    <img
                        src={
                        selectedImage
                            ? URL.createObjectURL(selectedImage)
                            : group.imageURL ?? null
                        }
                        alt="Group Preview"
                        style={{
                        width: 110,
                        height: 110,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #ccc",
                        cursor: "pointer"
                        }}
                    />
                    </label>
                    <input
                    type="file"
                    id="groupImageUpload"
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
                    name="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                    className="form-input"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                </div>

                {/* בחירת פרטיות */}
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
                    <button className="save-btn" onClick={handleEditProfile}>Save Changes</button>
                </div>
                </div>
            </div>
            </div>
        </div>,
        document.body
      )}

      {/* מודל חברי קבוצה */}
      {showMembersModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
            <div
              className="modal-content messenger-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Group Members</h3>
                <button onClick={() => setShowMembersModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="search-input-modal"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {members
                .filter((m) =>
                    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((m) => (
                    <Link
                    to={`/profile/${m._id}`}
                    key={m._id}
                    className="friend-item"
                    style={{ textDecoration: "none", color: "inherit" }}
                    onClick={() => setShowMembersModal(false)} // סגור את המודל בלחיצה
                    >
                    <img
                        src={m.imageURL}
                        alt="avatar"
                        className="comment-avatar"
                    />
                    <span>{m.firstName} {m.lastName}</span>
                    </Link>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
