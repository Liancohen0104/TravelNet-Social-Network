import { useState, useEffect } from "react";
import {
  FaUserPlus, FaCommentAlt, FaUsers, FaCheck,
  FaShareAlt, FaEnvelope, FaTimes, FaThumbsUp
} from "react-icons/fa";
import notificationApi from "../services/notificationApi";
import "../css/UserLayout.css";

const typeIcons = {
  friend_request: <FaUserPlus />,
  comment: <FaCommentAlt />,
  group_post: <FaUsers />,
  group_request: <FaUsers />,
  approved_request: <FaCheck />,
  share: <FaShareAlt />,
  message: <FaEnvelope />,
  like: <FaThumbsUp />,
};

export default function Notifications({ unreadNotifications, setUnreadNotifications, notifications, setNotifications }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // טעינה ראשונית
  useEffect(() => {
    fetchNotifications(1);
  }, []);

  // טעינה בגלילה
  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !loading && hasMore) {
        fetchNotifications(page + 1);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [page, hasMore, loading]);

  const fetchNotifications = async (pg) => {
    try {
      setLoading(true);
      const res = await notificationApi.getAllNotifications(pg);
      if (pg === 1) setNotifications(res.notifications);
      else setNotifications((prev) => [...prev, ...res.notifications]);
      setPage(pg);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnreadFilter = async () => {
    setFilter("unread");
    try {
      const unread = await notificationApi.getUnreadNotifications(1, 100);
      setNotifications(unread);
      setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch unread notifications", err);
    }
  };

  const handleAllFilter = () => {
    setFilter("all");
    fetchNotifications(1);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationApi.markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, isRead: true } : n
          )
        );
        setUnreadNotifications((count) => count - 1);
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      const toDelete = notifications.find((n) => n._id === id);
      if (toDelete && !toDelete.isRead) {
        setUnreadNotifications((count) => count - 1);
      }
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
    } catch (err) {
      console.error("Failed to mark all", err);
    }
  };

  const deleteAll = async () => {
    try {
      await notificationApi.deleteAllNotifications();
      setNotifications([]);
      setHasMore(false);
      setUnreadNotifications(0);
    } catch (err) {
      console.error("Failed to delete all notifications", err);
    }
  };

  return (
    <div className="notifications-panel">
      <div className="notifications-header">
        <button className={filter === "all" ? "active" : ""} onClick={handleAllFilter}>All</button>
        <button className={filter === "unread" ? "active" : ""} onClick={handleUnreadFilter}>Unread</button>
        <button onClick={deleteAll} className="delete-btn">Delete All</button>
        <button onClick={markAllAsRead} className="mark-btn">Mark All as Read</button>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 && (
          <div className="no-notifications">No notifications to show.</div>
        )}

        {notifications.map((n) => (
          <div
            key={n._id}
            className={`notification-item ${n.isRead ? "read" : "unread"}`}
            onClick={() => handleNotificationClick(n)}
          >
            <div className="avatar-wrapper">
              <img src={n.image} alt="sender" className="avatar" />
              <div className="type-icon">{typeIcons[n.type]}</div>
            </div>
            <div className="notification-info">
              <div className="name">{n.sender?.firstName} {n.sender?.lastName}</div>
              <div className="message">{n.message}</div>
              <div className="date">{new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
            <FaTimes
              className="delete-icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(n._id);
              }}
            />
          </div>
        ))}

        {loading && <div className="loader">Loading more...</div>}
      </div>
    </div>
  );
}
