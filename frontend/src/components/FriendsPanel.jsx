import { useEffect, useState } from "react";
import { UserPlus, MessageCircle, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function FriendsPanel() {
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const fetchFriends = async () => {
    try {
      const { data } = await API.get("/friends");
      setFriends(data.friends || []);
      setRequests(data.requests || []);
    } catch (error) {
      console.log("Friends error:", error.response?.data || error);
    }
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const { data } = await API.post("/friends/request", {
        email: email.trim()
      });

      setMessage(data.message);
      setEmail("");
      fetchFriends();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to send request");
    }
  };

  const acceptRequest = async (requestId) => {
    await API.put(`/friends/accept/${requestId}`);
    fetchFriends();
  };

  const rejectRequest = async (requestId) => {
    await API.put(`/friends/reject/${requestId}`);
    fetchFriends();
  };

  const avatar = (user) => {
    if (user?.avatarUrl) {
      return (
        <img
          src={`${BACKEND_URL}${user.avatarUrl}`}
          alt="avatar"
          className="friend-avatar-img"
        />
      );
    }

    return user?.avatar || user?.username?.charAt(0) || "U";
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <aside className="friends-panel">
      <div className="friends-header">
        <h3>Friends</h3>
        <span>{friends.length}</span>
      </div>

      <form className="add-friend-box" onSubmit={sendRequest}>
        <input
          placeholder="Friend email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit">
          <UserPlus size={16} />
        </button>
      </form>

      {message && <div className="friend-message">{message}</div>}

      {requests.length > 0 && (
        <>
          <div className="friend-section-title">Requests</div>

          {requests.map((request) => (
            <div className="friend-row" key={request._id}>
              <div className="friend-avatar">{avatar(request.from)}</div>

              <div className="friend-info">
                <strong>{request.from?.username}</strong>
                <span>Wants to be friends</span>
              </div>

              <button onClick={() => acceptRequest(request._id)}>
                <Check size={15} />
              </button>

              <button onClick={() => rejectRequest(request._id)}>
                <X size={15} />
              </button>
            </div>
          ))}
        </>
      )}

      <div className="friend-section-title">Online Friends</div>

      {friends.length === 0 && (
        <p className="empty-friends">No friends yet. Add by email.</p>
      )}

      {friends.map((friend) => (
        <div className="friend-row" key={friend._id}>
          <div className="friend-avatar">
            {avatar(friend)}
            <span className={`friend-status ${friend.status}`} />
          </div>

          <div className="friend-info">
            <strong>{friend.username}</strong>
            <span>{friend.status}</span>
          </div>

          <button onClick={() => navigate(`/dm/${friend._id}`)}>
            <MessageCircle size={16} />
          </button>
        </div>
      ))}
    </aside>
  );
}