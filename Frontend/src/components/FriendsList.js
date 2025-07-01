import { useEffect, useState, useRef, useCallback } from "react";
import usersApi from "../services/usersApi";
import { FiSearch } from "react-icons/fi";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function FriendsList() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const observer = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");

  const socket = useSocket();
  const { user: currentUser, loading: authLoading } = useAuth();

  const BATCH_SIZE = 10;

  const loadFriends = async (pageToLoad = page + 1) => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await usersApi.getMyFriends();
      const start = (pageToLoad - 1) * BATCH_SIZE;
      const next = res.slice(start, start + BATCH_SIZE);

      if (next.length < BATCH_SIZE) setHasMore(false);

      setFriends((prev) => [...prev, ...next]);
      setPage(pageToLoad);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const lastFriendRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadFriends();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  useEffect(() => {
    if (authLoading || !currentUser || !socket?.connected || searchQuery.trim()) return;

    setFriends([]);
    setPage(0);
    setHasMore(true);
    loadFriends(1);
  }, [currentUser, socket?.connected, authLoading, searchQuery]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = ({ userId, is_online, lastLogin }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, is_online, lastLogin } : f))
      );
    };

    socket.on("user-status-changed", handleStatusChange);
    return () => socket.off("user-status-changed", handleStatusChange);
  }, [socket]);

  // מאזין לאישור חבר
  useEffect(() => {
    if (!socket) return;

    const handleFriendshipUpdate = () => {
      setFriends([]);
      setPage(0);
      setHasMore(true);
      loadFriends(1);
    };

    socket.on("friendship-updated", handleFriendshipUpdate);
    return () => socket.off("friendship-updated", handleFriendshipUpdate);
  }, [socket]);

  const formatLastSeen = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}H`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}M`);
    if (parts.length === 0) parts.push("LESS THAN A MINUTE");

    return parts.join(" ") + " AGO";
  };

  const handleSearchFriends = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      // אם השדה ריק – טען מחדש את כל החברים
      setFriends([]);
      setPage(0);
      setHasMore(true);
      await loadFriends(1);
      return;
    }

    try {
      setLoading(true);
      const res = await usersApi.searchMyFriends(query);
      setFriends(res);
      setHasMore(false);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="friends-list">
      <div className="title">
        Friends
        <div className="title-icons">
          <FiSearch onClick={() => setShowSearch((prev) => !prev)} style={{ cursor: "pointer" }} />
        </div>
      </div>

      {showSearch && (
        <input
          type="text"
          placeholder="Search friends..."
          onChange={handleSearchFriends}
          className="search-friends-input"
        />
      )}

      <div className="friends-container">
        {friends.map((friend, index) => (
          <Link
            to={`/profile/${friend.id}`}
            key={friend.id || `${friend.name}-${index}`}
            className={`friend-item-link`}
          >
            <div
              className={`friend-item ${friend.is_online ? "online" : ""}`}
              ref={index === friends.length - 1 ? lastFriendRef : null}
            >
              <div className="avatar-container">
                <img src={friend.imageURL} alt="" className="avatar" />
                {friend.is_online && <div className="online-indicator"></div>}
              </div>
              <div className="info">
                <div className="name">{friend.name}</div>
                <div className="status">
                  {friend.is_online ? (
                    <div className="active-now">ACTIVE NOW</div>
                  ) : (
                    <>
                      <div className="last-seen-label">LAST SEEN</div>
                      <div className="last-seen-time">{formatLastSeen(friend.lastLogin)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}


        {loading && <div className="loader">Loading...</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
