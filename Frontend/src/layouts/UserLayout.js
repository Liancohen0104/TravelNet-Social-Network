import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import FriendRequestsSummary from "../components/FriendRequestsSummary";
import FriendsList from "../components/FriendsList";
import GroupRequestsSummary from "../components/GroupRequestsSummary";
import GroupsList from "../components/GroupsList";
import ChatPannel from "../components/ChatPannel";
import Notifications from "../components/Notifications";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext"; 
import notificationApi from "../services/notificationApi";
import usersApi from "../services/usersApi";
import "../css/UserLayout.css";

export default function UserLayout() {
  const { user } = useAuth();
  const socket = useSocket(); 
  const [activePanel, setActivePanel] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(user?.unreadNotificationsCount || 0);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(user?.unreadMessagesCount || 0);
  const [openConversationId, setOpenConversationId] = useState(null);

  // טעינה ראשונית של ההתראות
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await notificationApi.getAllNotifications();
        setNotifications(res.notifications);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    if (user) fetchNotifications();
  }, [user]);

  // האזנה להתראות בזמן אמת
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadNotifications((prev) => prev + 1);
    };

    socket.on("receive-notification", handleNewNotification);

    return () => {
      socket.off("receive-notification", handleNewNotification);
    };
  }, [socket, user]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message) => {
      setMessages((prev) => [message, ...prev]);
      fetchUnreadCounts();
    };

    socket.on("receive-message", handleNewMessage);

    return () => {
      socket.off("receive-message", handleNewMessage);
    };
  }, [socket, user]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await usersApi.getUnreadMessagesCount(); 
      setUnreadMessages(res.unreadMessages);
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  };

  return (
    <>
      <Navbar
        key={user?.username}
        role="user"
        onOpenPanel={setActivePanel}
        activePanel={activePanel}
        unreadNotifications={unreadNotifications}
        unreadMessages={unreadMessages}
      />

      <div className="layout-container">
        {/* צד שמאלי – תפריט צד נפתח */}
        <div className="layout-left">
          {activePanel === "notifications" && (
            <div className="panel-box" id="notifications-panel">
              <Notifications
                notifications={notifications}
                setNotifications={setNotifications}
                unreadNotifications={unreadNotifications}
                openConversationId={openConversationId}
                setUnreadNotifications={setUnreadNotifications}
              />
            </div>
          )}
          {activePanel === "chat" && (
            <div className="panel-box" id="notifications-panel">
              <ChatPannel
                unreadMessages={unreadMessages}
                setUnreadMessages={setUnreadMessages}
                openConversationId={openConversationId}
                setOpenConversationId={setOpenConversationId}
                refreshUnreadMessages={fetchUnreadCounts}/>
            </div>
          )}
          {activePanel === "groups" && (
            <div>
              <div className="friend-requests-box">
                <GroupRequestsSummary />
              </div>
              <div className="online-friends-box">
                <GroupsList />
              </div>
            </div>
          )}
        </div>

        {/* מרכז – פיד */}
        <div className="layout-main">
          <Outlet />
        </div>

        {/* צד ימין – חברים ובקשות חברות */}
        <div className="layout-right">
          <div className="friend-requests-box">
            <FriendRequestsSummary />
          </div>
          <div className="online-friends-box">
            <FriendsList />
          </div>
        </div>
      </div>
    </>
  );
}
