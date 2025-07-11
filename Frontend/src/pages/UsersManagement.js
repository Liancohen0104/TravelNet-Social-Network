import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../services/adminApi";
import { FaTrashAlt } from "react-icons/fa";
import "../css/SearchPage.css";

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const loaderRef = useRef(null);
  const limit = 10;
  const navigate = useNavigate();

  const fetchUsers = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers(skip, limit);
      const newUsers = res.users.filter(
        (u) => !users.some((existing) => existing._id === u._id)
      );

      if (newUsers.length < limit) setHasMore(false);

      setUsers((prev) => [...prev, ...newUsers]);
      setSkip((prev) => prev + limit);
      setInitialLoadDone(true);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!loaderRef.current || loading || !initialLoadDone) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchUsers();
        }
      },
      { threshold: 1 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef.current, hasMore, loading, initialLoadDone]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const goToUserProfile = (userId) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="search-page">
      <h2 style={{ marginBottom: "20px" }}>Users Management</h2>
      <div className="card-list">
        {users.map((user) => (
          <div key={user._id} className="card user-card horizontal-user-card">
            <img
              src={user.imageURL}
              alt="avatar"
              className="avatar small-circle"
              style={{ cursor: "pointer" }}
              onClick={() => goToUserProfile(user._id)}
            />
            <div className="user-info">
              <div className="user-name">
                {user.fullName || `${user.firstName} ${user.lastName}`}
              </div>
              <div className="location">{user.location}</div>
              <div className="dob">
                {user.dateOfBirth &&
                  new Date(user.dateOfBirth).toLocaleDateString()}
              </div>
            </div>
            <div
              className="delete-icon"
              onClick={() => handleDelete(user._id)}
              style={{
                marginLeft: "auto",
                cursor: "pointer",
                color: "#d33",
                fontSize: "1.2rem",
                paddingRight: "15px",
              }}
            >
              <FaTrashAlt />
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <span className="loader">Loading...</span>
        </div>
      )}

      {!loading && hasMore && (
        <div ref={loaderRef} style={{ height: "1px" }}></div>
      )}
    </div>
  );
}
