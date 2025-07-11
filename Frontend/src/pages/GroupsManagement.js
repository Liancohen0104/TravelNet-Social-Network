import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../services/adminApi";
import { FaTrashAlt, FaGlobeAmericas, FaLock } from "react-icons/fa";
import "../css/SearchPage.css";

export default function GroupsManagement() {
  const [groups, setGroups] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const loaderRef = useRef(null);
  const navigate = useNavigate();
  const limit = 10;

  const fetchGroups = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await adminApi.getAllGroups(skip, limit);

      const newGroups = res.groups.filter(
        (g) => !groups.some((existing) => existing._id === g._id)
      );

      if (newGroups.length < limit) setHasMore(false);

      setGroups((prev) => [...prev, ...newGroups]);
      setSkip((prev) => prev + limit);
      setInitialLoadDone(true);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!loaderRef.current || loading || !initialLoadDone) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchGroups();
        }
      },
      { threshold: 1 }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loaderRef.current, hasMore, loading, initialLoadDone]);

  const handleDelete = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      await adminApi.deleteGroupByAdmin(groupId);
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
    } catch (err) {
      alert("Failed to delete group");
    }
  };

  const goToGroupProfile = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  return (
    <div className="search-page">
      <h2 style={{ marginBottom: "20px" }}>Groups Management</h2>
      <div className="card-list">
        {groups.map((group) => (
          <div key={group._id} className="card user-card horizontal-user-card">
            <img
              src={group.imageURL}
              alt="group"
              className="avatar small-circle"
              style={{ cursor: "pointer" }}
              onClick={() => goToGroupProfile(group._id)}
            />
            <div className="user-info">
              <div className="user-name">{group.name}</div>
              <div className="location">{group.description}</div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px", paddingRight: "15px" }}>
              {group.isPublic ? (
                <FaGlobeAmericas style={{ color: "#555" }} />
              ) : (
                <FaLock style={{ color: "#555" }} />
              )}
              <FaTrashAlt
                style={{ color: "#d33", cursor: "pointer" }}
                onClick={() => handleDelete(group._id)}
              />
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
