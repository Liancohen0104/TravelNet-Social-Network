import { useState, useEffect, useRef } from "react";
import conversationApi from "../services/conversationApi";
import chatApi from "../services/chatApi";
import { FaTimes, FaPaperclip } from "react-icons/fa";
import "../css/ChatPopup.css";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

export default function ChatPopup({
  friend,
  conversationId: initialConvId,
  onClose,
  onNewConversation,
  existingConversationIds,
  setOpenConversationId,
}) {
  const [conversationId, setConversationId] = useState(initialConvId || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [shouldScrollOnOpen, setShouldScrollOnOpen] = useState(true);
  const [localFriend, setLocalFriend] = useState(friend);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const topTriggerRef = useRef(null);
  const observer = useRef(null);
  const fileInputRef = useRef(null);

  const { user } = useAuth();
  const socket = useSocket();
  const recipientId = friend.id || friend._id;
  const friendName = friend.name || `${friend.firstName} ${friend.lastName}`;

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  useEffect(() => {
    return () => {
      onClose();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = ({ userId, is_online, lastLogin }) => {
      if (userId === recipientId) {
        setLocalFriend((prev) => ({
          ...prev,
          is_online,
          lastLogin,
        }));
      }
    };

    socket.on("user-status-changed", handleStatusChange);
    return () => socket.off("user-status-changed", handleStatusChange);
  }, [socket, recipientId]);

  const waitForMediaLoad = () => {
    return new Promise((resolve) => {
      const media = messagesContainerRef.current?.querySelectorAll("img, video") || [];
      let loaded = 0;
      if (media.length === 0) return resolve();
      media.forEach((el) => {
        const isLoaded =
          (el.tagName === "IMG" && el.complete) ||
          (el.tagName === "VIDEO" && el.readyState >= 3);
        if (isLoaded) {
          loaded++;
          if (loaded === media.length) resolve();
        } else {
          el.onload = el.onerror = el.onloadeddata = () => {
            loaded++;
            if (loaded === media.length) resolve();
          };
        }
      });
    });
  };

  useEffect(() => {
    if (!messages.length || !shouldScrollOnOpen) return;
    const scrollAfterMount = async () => {
      await waitForMediaLoad();
      await sleep(50);
      scrollToBottom();
      setInitialLoadDone(true);
      setShouldScrollOnOpen(false);
    };
    scrollAfterMount();
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (msg.conversation === conversationId) {
        const shouldScroll = isScrolledToBottom();
        setMessages((prev) => [...prev, msg]);
        if (shouldScroll) scrollToBottom();
      }
    };

    if (
      conversationId &&
      typeof onNewConversation === "function" &&
      !existingConversationIds?.includes(conversationId)
    ) {
      onNewConversation();
    }

    if (conversationId && typeof setOpenConversationId === "function") {
      setOpenConversationId((prev) =>
        prev !== conversationId ? conversationId : prev
      );
    }

    socket.on("receive-message", handleNewMessage);
    return () => socket.off("receive-message", handleNewMessage);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId && recipientId) {
      getOrCreateConversation(recipientId);
    } else if (conversationId) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      setInitialLoadDone(false);
      setShouldScrollOnOpen(true);
      fetchMessages(conversationId, 1);
    }
  }, [conversationId, recipientId]);

  useEffect(() => {
    if (!initialLoadDone || loading || !hasMore || !conversationId) return;
    const trigger = topTriggerRef.current;
    if (!trigger) return;

    const observerInstance = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMessages(conversationId, page + 1);
      }
    });

    observerInstance.observe(trigger);
    observer.current = observerInstance;

    return () => observerInstance.disconnect();
  }, [initialLoadDone, loading, hasMore, page, conversationId]);

  const fetchMessages = async (convId, pageToLoad = 1) => {
    if (loading) return;
    try {
      setLoading(true);
      const container = messagesContainerRef.current;
      const prevScrollHeight = container?.scrollHeight || 0;

      await sleep(300);

      const res = await conversationApi.getMessagesByConversation(
        convId,
        pageToLoad,
        20
      );

      if (res.length < 20) setHasMore(false);
      setMessages((prev) => [...res, ...prev]);
      setPage(pageToLoad);

      if (pageToLoad > 1) {
        setTimeout(() => {
          const newScrollHeight = container?.scrollHeight || 0;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        }, 0);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateConversation = async (friendId) => {
    try {
      const res = await conversationApi.getOrCreateConversation(friendId);
      setConversationId(res._id);
      fetchMessages(res._id, 1);
    } catch (err) {
      console.error("Failed to create/get conversation", err);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      const formData = new FormData();
      formData.append("recipientId", recipientId);
      formData.append("text", newMessage);
      const sent = await chatApi.sendMessage(formData);
      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMediaClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("recipientId", recipientId);
      formData.append("conversationId", conversationId);
      formData.append("file", file);
      formData.append("text", "");
      const sent = await chatApi.sendMessage(formData);
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();
    } catch (err) {
      console.error("Failed to send file", err);
    }

    e.target.value = "";
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 0);
    });
  };

  const isScrolledToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distance <= 150;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!friend) return null;

  return (
    <div className="chat-popup">
      <div className="chat-header">
        <div className="friend-info">
          <div className="avatar-container">
            <img src={localFriend.imageURL} alt={friendName} className="header-avatar" />
            {localFriend.is_online && <span className="online-indicator" />}
          </div>
          <div className="friend-details">
            <span className="friend-name">{friendName}</span>
          </div>
        </div>
        <FaTimes
          onClick={onClose}
          className="close-icon"
        />
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        <div ref={topTriggerRef} className="top-trigger" />
        {messages.map((msg, i) => {
          const isMyMessage = msg.sender === user._id;
          const senderAvatar = isMyMessage ? user.imageURL : friend.imageURL;
          return (
            <div
              key={msg._id || i}
              className={`message-container ${isMyMessage ? "my-message" : "their-message"}`}
            >
              <div className="message-avatar">
                <img src={senderAvatar} alt="avatar" className="avatar" />
              </div>
              <div className="message-content">
                <div
                  className={`chat-bubble ${isMyMessage ? "my-bubble" : "their-bubble"} ${
                    msg.attachment?.type === "image" ? "image-bubble" : ""
                  }`}
                >
                  {msg.attachment?.url ? (
                    msg.attachment.type === "image" ? (
                      <img src={msg.attachment.url} alt="attachment" className="chat-image" />
                    ) : msg.attachment.type === "video" ? (
                      <video controls className="chat-video">
                        <source src={msg.attachment.url} type="video/mp4" />
                      </video>
                    ) : null
                  ) : (
                    <span className="message-text">{msg.text}</span>
                  )}
                  <span className="message-time">{formatTime(msg.createdAt || Date.now())}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="message-input"
        />
        <button className="media-icon-button" title="Attach media" onClick={handleMediaClick}>
          <FaPaperclip />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: "none" }}
          accept="image/*,video/*"
        />
      </div>
    </div>
  );
}
