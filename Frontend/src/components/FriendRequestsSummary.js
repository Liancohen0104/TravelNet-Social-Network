import { useEffect, useState } from "react";
import usersApi from "../services/usersApi";
import { useSocket } from "../contexts/SocketContext";

export default function FriendRequestsSummary() {
  const [requests, setRequests] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const socket = useSocket();

  // טוען את הבקשות בתחילה
  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = () => {
        fetchRequests();
    };

    socket.on("new-friend-request", handleNewRequest);

    return () => {
        socket.off("new-friend-request", handleNewRequest);
    };
  }, [socket]);

  // טעינת הבקשות מהשרת
  const fetchRequests = () => {
    usersApi
      .getPendingRequests()
      .then(setRequests)
      .catch((err) => console.error("Failed to load requests", err));
  };

  // אישור בקשה
  const handleApprove = async (senderId) => {
    try {
      await usersApi.approveFriendRequest(senderId);
      setRequests((prev) => prev.filter((r) => r._id !== senderId));
    } catch (err) {
      console.error("Failed to approve request", err);
    }
  };

  // דחיית בקשה
  const handleReject = async (senderId) => {
    try {
      await usersApi.rejectFriendRequest(senderId);
      setRequests((prev) => prev.filter((r) => r._id !== senderId));
    } catch (err) {
      console.error("Failed to reject request", err);
    }
  };

  return (
    <div className="friend-requests-summary">
        <div className="title">
        Friend requests ({requests.length})
        <button
            className="see-all-link"
            onClick={() => setShowPanel((prev) => !prev)}
        >
            See All
        </button>
        </div>

        {showPanel && (
        <div className="friend-requests-panel">
            {requests.length === 0 ? (
            <p>No pending requests</p>
            ) : (
            requests.map((req) => (
                <div className="request-item" key={req._id}>
                    <div className="avatar-container">
                        <img src={req.imageURL} alt="" className="avatar" />
                    </div>
                    <div className="info">
                        <div className="name">
                            {req.firstName} {req.lastName}
                        </div>
                    </div>
                    <div className="actions">
                        <button onClick={() => handleApprove(req._id)} className="confirm-btn">
                            Confirm
                        </button>
                        <button onClick={() => handleReject(req._id)} className="delete-btn">
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