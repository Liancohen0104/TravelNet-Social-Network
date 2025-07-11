import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext"; 
import { useEffect, useState } from "react";
import usersApi from "../services/usersApi";
import Feed from "../components/Feed";
import "../css/Profile.css";
import "../css/PostCard.css";
import PostCard from "../components/PostCard"
import { FaTimes, FaRegEdit, FaBirthdayCake, FaMapMarkerAlt, FaUser, FaTrashAlt, FaBookmark } from "react-icons/fa";

export default function ProfilePage() {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const socket = useSocket();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isMyProfile = !id || id === authUser?._id;
  const userId = id || authUser?._id;

  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null); // 'none' | 'pending' | 'friends'
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    dateOfBirth: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  
  const fetchSavedPosts = async () => {
    setLoadingSaved(true);
    try {
        const res = await usersApi.getSavedPosts();
        const enriched = await Promise.all(
        res.map(async (post) => {
            const isLiked = post.likes?.includes(authUser._id);
            return { ...post, isLiked };
        }));
        setSavedPosts(enriched);
        setShowSavedModal(true);
    } catch (err) {
        alert(err.response?.data?.error || "Failed to load saved posts");
    } finally {
        setLoadingSaved(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (!userId) return;
        const res = isMyProfile
          ? await usersApi.getCurrentUser()
          : await usersApi.getUserById(userId);
        setProfileData(res.user || res);
      } catch (err) {
        setError(
          err.responseJSON?.error ||
          err.response?.data?.error ||
          err.message ||
          "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  
  useEffect(() => {
    if (!socket || isMyProfile) return;

    const handleFriendUpdate = () => {
        setFriendStatus("friends");
    };

    const handleFriendDeclined = () => {
        setFriendStatus("none");
    };


    socket.on("friend-request-accepted", handleFriendUpdate);
    socket.on("friend-request-declined", handleFriendDeclined);

    return () => {
        socket.off("friendship-accepted", handleFriendUpdate);
        socket.off("friend-request-declined", handleFriendDeclined);
    };
  }, [socket, isMyProfile]);

  useEffect(() => {
    if (!isMyProfile && userId) {
        usersApi.getFriendStatus(userId)
        .then(res => setFriendStatus(res.status))
        .catch(() => setFriendStatus("none"));
    }
  }, [userId, isMyProfile]);


  const openEditModal = () => {
    setForm({
      firstName: profileData.firstName || "",
      lastName: profileData.lastName || "",
      bio: profileData.bio || "",
      location: profileData.location || "",
      dateOfBirth: profileData.dateOfBirth?.slice(0, 10) || ""
    });
    setSelectedImage(null);
    setShowEdit(true);
  };

  const openPasswordModal = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setShowPasswordModal(true);
  };

  const handleEditProfile = async () => {
    const formData = new FormData();
    for (let key in form) {
      formData.append(key, form[key]);
    }
    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    try {
      await usersApi.updateProfile(formData);
      alert("Profile updated!");
      setShowEdit(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating profile");
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const formData = new FormData();
    for (let key in passwordForm) {
      if (passwordForm[key]) formData.append(key, passwordForm[key]);
    }

    try {
      await usersApi.updateProfile(formData);
      alert("Password updated!");
      setShowPasswordModal(false);
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || "Error updating password");
    }
  };

  const handleDeleteMyProfile = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your profile?");
    if (!confirmed) return;

    try {
      await usersApi.deleteMyAccount();
      alert("Your profile has been successfully deleted.");
      window.location.href = "/";
    } catch (err) {
      alert(err.response?.data?.error || "An error occurred while deleting your profile.");
    }
  };

  const handleSendFriendRequest = async () => {
    try {
        await usersApi.sendFriendRequest(userId);
        setFriendStatus("pending");
    } catch (err) {
        alert(err.response?.data?.error || "Failed to send friend request");
    }
  };

  const handleUnfriend = async () => {
    try {
      await usersApi.unfriend(userId);
      setFriendStatus("none");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove friend");
    }
  };

  if (loading) return <div className="profile-page">Loading...</div>;
  if (error) return <div className="profile-page error">{error}</div>;
  if (!profileData) return null;

  return (
    <div className="profile-page">
      <div className="profile-top">
        <div className="profile-action-buttons">
          {isMyProfile && <button className="saved-posts-icon" onClick={fetchSavedPosts}><FaBookmark/> </button>}
          {isMyProfile && <button className="edit-profile-icon" onClick={openEditModal}><FaRegEdit /></button>}
          {isMyProfile && <button className="delete-profile-icon" onClick={handleDeleteMyProfile}><FaTrashAlt /></button>}
        </div>

        <div className="profile-header-row">
          <div className="profile-avatar">
            <img src={profileData.imageURL} alt="Profile" />
          </div>

          <div className="profile-main-info">
            <h2 className="profile-name">{profileData.firstName} {profileData.lastName}</h2>
            <div className="friends-count">{profileData.friends?.length || 0} Friends</div>
          </div>
        </div>

        <div className="profile-bottom-section">
          {profileData.bio && (
            <div className="about-item"><FaUser /> {profileData.bio}</div>
          )}
          {profileData.location && (
            <div className="about-item"><FaMapMarkerAlt /> {profileData.location}</div>
          )}
          {profileData.dateOfBirth && (
            <div className="about-item">
              <FaBirthdayCake /> {new Date(profileData.dateOfBirth).toLocaleDateString("he-IL")}
            </div>
          )}
        </div>

        {!isMyProfile && (
          <div className="friend-action-container">
            {friendStatus === "none" && authUser.role !== "admin" && (
              <button className="friend-btn" onClick={handleSendFriendRequest}>Add Friend</button>
            )}
            {friendStatus === "pending" && (
              <button className="friend-btn pending" disabled>Pending...</button>
            )}
            {friendStatus === "friends" && (
              <button className="friend-btn remove" onClick={handleUnfriend}>Remove Friend</button>
            )}
          </div>
        )}
      </div>
      
      {(!isMyProfile || authUser.role !== "admin") &&
        <div className="profile-bottom">
          <Feed userId={userId} canCreatePost={isMyProfile} />
        </div>
      }

      {/* מודל עריכה */}
      {showEdit && (
        <div className="comment-modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="close-btn" onClick={() => setShowEdit(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div className="comments-list">
                {/* תמונה + העלאה */}
                <div className="form-group" style={{ textAlign: "center" }}>
                  <label htmlFor="imageUpload" className="image-label">
                    <img
                      src={selectedImage ? URL.createObjectURL(selectedImage) : profileData.imageURL}
                      alt="Preview"
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
                    id="imageUpload"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedImage(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {/* שאר השדות */}
                {["firstName", "lastName", "bio", "location"].map((field) => (
                  <div className="form-group" key={field}>
                    <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <input
                      className="form-input"
                      type="text"
                      name={field}
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    />
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    className="form-input"
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </div>

                <div className="form-buttons">
                  <button className="save-btn" onClick={handleEditProfile}>Save Changes</button>
                  <button className="password-btn" onClick={openPasswordModal}>Change Password</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מודל סיסמה */}
      {showPasswordModal && (
        <div className="comment-modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
              <div className="comments-list">
                {["currentPassword", "newPassword", "confirmPassword"].map((field, index) => (
                  <div className="form-group" key={index}>
                    <label className="form-label">
                      {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <input
                      className="form-input"
                      type="password"
                      name={field}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <button className="save-btn" onClick={handlePasswordChange}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* מודל פוסטים שמורים */}
      {showSavedModal && (
        <div className="comment-modal-overlay" onClick={() => setShowSavedModal(false)}>
            <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Saved Posts</h3>
                <button className="close-btn" onClick={() => setShowSavedModal(false)}><FaTimes /></button>
            </div>
            <div className="modal-content">
                {loadingSaved ? (
                <div className="loader">Loading...</div>
                ) : savedPosts.length === 0 ? (
                <div style={{ padding: "1rem" }}>You have no saved posts.</div>
                ) : (
                savedPosts.map((post) => (
                    <div key={post._id} style={{ marginBottom: "1rem" }}>
                    <PostCard
                        post={post}
                        onPostDeleted={(id) =>
                            setSavedPosts((prev) => prev.filter((p) => p._id !== id))
                        }
                        onPostUpdated={(updatedPost) =>
                            setSavedPosts((prev) =>
                            prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
                            )
                        }
                        onUnsave={() =>
                          setSavedPosts((prev) => prev.filter((p) => p._id !== post._id))
                        }
                        />
                    </div>
                ))
                )}
            </div>
            </div>
        </div>
        )}
    </div>
  );
}
