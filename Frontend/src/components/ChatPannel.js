import { useState, useEffect } from "react";
import { FaEnvelopeOpenText, FaTimes, FaEnvelope, FaRegEdit  } from "react-icons/fa";
import conversationApi from "../services/conversationApi";
import "../css/UserLayout.css";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import ChatPopup from "./ChatPopup.js";
import StartChatModal from "./StartChatModal";

export default function ChatPanel({ setUnreadMessages, openConversationId , setOpenConversationId, refreshUnreadMessages }) {
  const [conversations, setConversations] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const socket = useSocket(); 
  const [activePopup, setActivePopup] = useState(null);
  const [showStartChatModal, setShowStartChatModal] = useState(false);

  useEffect(() => {
    fetchConversations(1);
  }, []);

  useEffect(() => {
    const handleNewMessage = async (msg) => {
      setConversations((prev) => {
        const index = prev.findIndex((conv) => conv._id === msg.conversation);
        if (index !== -1) {
          const updated = {
            ...prev[index],
            lastMessage: msg,
            isUnread:
              msg.isRead === false &&
              msg.recipient === user._id &&
              openConversationId !== msg.conversation,
          };
          return [updated, ...prev.slice(0, index), ...prev.slice(index + 1)];
        } else {
          fetchConversations(1); 
          return prev;
        }
      });

      // אם השיחה לא פתוחה – נחשב הודעה שלא נקראה
      if (msg.conversation !== openConversationId) {
      } else {
        // אם השיחה פתוחה – נסמן את ההודעה כנקראה בבקאנד
        try {
          await conversationApi.markMessagesAsRead(msg.conversation);
          refreshUnreadMessages();
        } catch (err) {
          console.error("Failed to auto-mark as read:", err);
        }
      }
    };

    socket.on("receive-message", handleNewMessage);
    return () => socket.off("receive-message", handleNewMessage);
  }, [socket, openConversationId]);

  useEffect(() => {
    const onScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
        !loading &&
        hasMore
      ) {
        fetchConversations(page + 1);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [page, hasMore, loading]);

  const computeIsUnread = (c, openId, userId) =>
    c.lastMessage?.isRead === false &&
    c.lastMessage?.recipient === userId &&
    openId !== c._id;

  const fetchConversations = async (pg) => {
    try {
      setLoading(true);
      const res = await conversationApi.getConversations(pg);

      const conversationsWithSelfMarked = res.conversations.map((c) => {
        const updatedParticipants = c.participants.map((p) => ({
          ...p,
          isSelf: p._id === user._id
        }));

        return {
          ...c,
          participants: updatedParticipants,
          isUnread: computeIsUnread(c, openConversationId, user._id)
        };
      });

      setConversations((prev) => {
        const updated =
          pg === 1 ? conversationsWithSelfMarked : [...prev, ...conversationsWithSelfMarked];
        return updated;
      });

      if (pg === 1 && res.unreadMessagesCount !== undefined) {
        setUnreadMessages(res.unreadMessagesCount);
      }

      setPage(pg);
      setHasMore(pg < res.totalPages);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnreadFilter = () => {
    setFilter("unread");
    setConversations((prev) => prev.filter((c) => !c.lastMessage?.isRead));
    setHasMore(false);
  };

  const handleAllFilter = () => {
    setFilter("all");
    fetchConversations(1);
  };

  const handleMarkAsRead = async (conversationId) => {
    try {
      await conversationApi.markMessagesAsRead(conversationId);
      refreshUnreadMessages();

      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? { ...c, lastMessage: { ...c.lastMessage, isRead: true }, isUnread: false, }
            : c
        )
      );

    } catch (err) {
      console.error("Failed to mark messages as read", err);
    }
  };

  const handleClick = (conversation) => {
    handleMarkAsRead(conversation._id);
    refreshUnreadMessages();

    const friend = conversation.participants.find((p) => !p.isSelf);

    // שלב ראשון – סגירה
    setActivePopup(null);
    setOpenConversationId(null);

    // שלב שני – פתיחה לאחר זמן קצר
    setTimeout(() => {
      setActivePopup({
        friend,
        conversationId: conversation._id,
        key: conversation._id + "-" + Date.now() 
      });
      setOpenConversationId(conversation._id);
    }, 50); // המתנה קטנה
  };

  const markAllAsRead = async () => {
    try {
      await conversationApi.markAllMessagesAsRead();
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          lastMessage: { ...c.lastMessage, isRead: true },
        }))
      );
    refreshUnreadMessages();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const deleteAll = async () => {
    try {
      await conversationApi.deleteAllConversations();
      setConversations([]);
      setHasMore(false);
      refreshUnreadMessages();
    } catch (err) {
      console.error("Failed to delete all conversations", err);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await conversationApi.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      refreshUnreadMessages();
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const handleStartChat = (friend) => {
    setActivePopup({ friend, conversationId: null });
    setShowStartChatModal(false);
  };

  return (
    <div className="notifications-panel">
      <div className="start-chat-button-container">
        <button
          className="floating-start-chat-btn"
          onClick={() => setShowStartChatModal(true)}
          title="Start new chat"
        >
          <FaRegEdit />
        </button>
      </div>
      <div className="notifications-header">
        <button className={filter === "all" ? "active" : ""} onClick={handleAllFilter}>
          All
        </button>
        <button className={filter === "unread" ? "active" : ""} onClick={handleUnreadFilter}>
          Unread
        </button>
        <button onClick={deleteAll} className="delete-btn">
          Delete All
        </button>
        <button onClick={markAllAsRead} className="mark-btn">
          Mark All as Read
        </button>
      </div>

      <div className="notifications-list">
        {conversations.length === 0 && (
          <div className="no-notifications">No conversations to show.</div>
        )}

        {conversations.map((c) => {
          const friend = c.participants.find((p) => !p.isSelf);
          const isUnread = c.isUnread;

          return (
            <div
              key={c._id}
              className={`notification-item ${isUnread ? "unread" : "read-message"}`}
              onClick={() => handleClick(c)}
            >
              <div className="avatar-wrapper">
                {console.log("friend", friend)}
                <img src={friend.imageURL} alt="avatar" className="avatar" />
                <div className="type-icon">
                  {isUnread ? <FaEnvelope /> : <FaEnvelopeOpenText />}
                </div>
              </div>
              <div className="notification-info">
                <div className="name">
                  {friend.firstName} {friend.lastName}
                </div>
                <div className="message">
                  {c.lastMessage?.text?.slice(0, 40)}
                </div>
                <div className="date">{new Date(c.updatedAt).toLocaleDateString()}</div>
              </div>
              <FaTimes
                className="delete-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(c._id);
                }}
              />
            </div>
          );
        })}

        {activePopup && (
          <ChatPopup
            key={activePopup.key}
            friend={activePopup.friend}
            conversationId={activePopup.conversationId}
            onClose={() => {
              setActivePopup(null);
              setOpenConversationId(null); 
              
            }}
            onNewConversation={handleAllFilter}
            existingConversationIds={conversations.map(c => c._id)}
            openConversationId={openConversationId}
            setOpenConversationId={setOpenConversationId} 
          />
        )}

        {showStartChatModal && (
          <StartChatModal
            onClose={() => setShowStartChatModal(false)}
            onSelectFriend={handleStartChat}
          />
        )}

        {loading && <div className="loader">Loading more...</div>}
      </div>
    </div>
  );
}
