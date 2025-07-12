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

  const [advancedFilters, setAdvancedFilters] = useState({
    fullName: "",
    location: "",
    minAge: "",
    maxAge: "",
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

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from the group?")) return;
    try {
      await groupApi.removeMemberFromGroup(groupId, memberId);
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
      alert("Member removed successfully");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove member");
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
        {group.isPublic && <Feed key={groupId} groupId={groupId} />}
        {!group.isPublic && (isMember || user?.role === "admin") && <Feed key={groupId} groupId={groupId} canCreatePost={isMember} />}
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
                {isCreator ? (
                  <div className="advanced-filters">
                    <input
                      type="text"
                      placeholder="Search by name"
                      value={advancedFilters.fullName}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Search by location"
                      value={advancedFilters.location}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, location: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Min Age"
                      value={advancedFilters.minAge}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, minAge: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Max Age"
                      value={advancedFilters.maxAge}
                      onChange={(e) => setAdvancedFilters((prev) => ({ ...prev, maxAge: e.target.value }))}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    className="search-input-modal"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                )}
                {members
                  .filter((m) => {
                    if (!isCreator) {
                      return `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
                    }

                    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
                    const location = m.location?.toLowerCase() || "";
                    const dob = m.dateOfBirth ? new Date(m.dateOfBirth) : null;

                    const now = new Date();
                    const age = dob ? now.getFullYear() - dob.getFullYear() -
                      (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0) : null;

                    const matchesName = fullName.includes(advancedFilters.fullName.toLowerCase());
                    const matchesLocation = location.includes(advancedFilters.location.toLowerCase());
                    const matchesMinAge = !advancedFilters.minAge || (age !== null && age >= Number(advancedFilters.minAge));
                    const matchesMaxAge = !advancedFilters.maxAge || (age !== null && age <= Number(advancedFilters.maxAge));

                    return matchesName && matchesLocation && matchesMinAge && matchesMaxAge;
                  })

                  .map((m) => (
                    <div key={m._id} className="friend-item-with-delete">
                      <Link
                        to={`/profile/${m._id}`}
                        className="friend-item"
                        style={{ textDecoration: "none", color: "inherit" }}
                        onClick={() => setShowMembersModal(false)}
                      >
                        <img
                          src={m.imageURL}
                          alt="avatar"
                          className="comment-avatar"
                        />
                        <div className="group-member-info">
                          <span><strong>{m.firstName} {m.lastName}</strong></span>
                          {m.location && <span className="location">{m.location}</span>}
                          {m.dateOfBirth && (
                            <span className="dob">
                              {new Date(m.dateOfBirth).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* כפתור מחיקה – רק ליוצר */}
                      {isCreator && m._id !== user._id && (
                        <button
                          className="remove-member-btn"
                          onClick={() => handleRemoveMember(m._id)}
                          title="Remove member"
                        >
                          <FaTrashAlt />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
