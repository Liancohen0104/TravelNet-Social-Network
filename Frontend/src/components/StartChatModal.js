import { useState, useEffect } from "react";
import usersApi from "../services/usersApi";
import { FaTimes } from "react-icons/fa";
import "../css/StartChatModal.css";

export default function StartChatModal({ onClose, onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getMyFriends();
      setFriends(res);
    } catch (err) {
      console.error("Failed to load friends", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = friends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="start-chat-modal-overlay" onClick={onClose}>
      <div className="start-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Start New Chat</h3>
          <FaTimes className="close-btn" onClick={onClose} />
        </div>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input-modal"
          />
        </div>

        <div className="friend-list">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading friends...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span>No friends found</span>
            </div>
          ) : (
            filtered.map((friend) => (
              <div
                key={friend.id}
                className="friend-item"
                onClick={() => onSelectFriend(friend)}
              >
                <img 
                  src={friend.imageURL} 
                  alt={friend.name}
                  className="avatar" 
                />
                <div className="friend-info">
                  <span className="name">{friend.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}