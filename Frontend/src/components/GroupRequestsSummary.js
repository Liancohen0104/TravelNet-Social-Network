import { useEffect, useState } from "react";
import groupApi from "../services/groupApi";
import usersApi from "../services/usersApi";
import { useSocket } from "../contexts/SocketContext";

export default function GroupRequestsSummary() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewGroupRequest = () => {
      fetchPendingRequests();
    };

    socket.on("new-group-request", handleNewGroupRequest);
    return () => socket.off("new-group-request", handleNewGroupRequest);
  }, [socket]);

  const fetchPendingRequests = async () => {
    try {
      const data = await usersApi.getMyGroupsPendingRequests(); // מחזיר מערך שטוח
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to load pending group requests", err);
    }
  };

  const handleApprove = async (groupId, userId) => {
    try {
      await groupApi.approveJoinRequest(groupId, userId);
      fetchPendingRequests();
    } catch (err) {
      console.error("Failed to approve join request", err);
    }
  };

  const handleReject = async (groupId, userId) => {
    try {
      await groupApi.rejectJoinRequest(groupId, userId);
      fetchPendingRequests();
    } catch (err) {
      console.error("Failed to reject join request", err);
    }
  };

  return (
    <div className="friend-requests-summary">
      <div className="title">
        Group Join Requests ({pendingRequests.length})
        <button
          className="see-all-link"
          onClick={() => setShowPanel((prev) => !prev)}
        >
          See All
        </button>
      </div>

      {showPanel && (
        <div className="friend-requests-panel">
          {pendingRequests.length === 0 ? (
            <p>No pending requests</p>
          ) : (
            pendingRequests.map((req) => (
              <div className="request-item" key={`${req.groupId}-${req.userId}`}>
                <div className="avatar-container">
                  <img src={req.imageURL} alt="" className="avatar" />
                </div>
                <div className="info">
                  <div className="name">
                    {req.firstName} {req.lastName}
                  </div>
                  <div className="group-name-label">{req.groupName}</div>
                </div>
                <div className="actions">
                  <button
                    onClick={() => handleApprove(req.groupId, req.userId)}
                    className="confirm-btn"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleReject(req.groupId, req.userId)}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
