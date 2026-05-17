import { useEffect, useState } from "react";
import { ArrowLeft, Check, MessageCircle, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") || avatarUrl.startsWith("blob:")) {
    return avatarUrl;
  }
  return `${BACKEND_URL}${avatarUrl}`;
};

export default function FriendsPage() {
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
          src={getAvatarUrl(user.avatarUrl)}
          alt=""
          className="friend-avatar-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return user?.avatar || user?.username?.charAt(0) || "U";
  };

  return (
    <div className="friends-page">
      <div className="friends-page-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="friends-hero">
          <div>
            <h1>Friends</h1>
            <p>Add friends, accept requests, and start private messages.</p>
          </div>

          <div className="friends-count-badge">
            {friends.length}
            <span>Friends</span>
          </div>
        </div>

        <form className="friends-add-card" onSubmit={sendRequest}>
          <div>
            <h2>Add Friend</h2>
            <p>Enter the email address of another registered user.</p>
          </div>

          <div className="friends-add-row">
            <input
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button>
              <UserPlus size={18} />
              Send Request
            </button>
          </div>

          {message && <div className="friend-message big">{message}</div>}
        </form>

        {requests.length > 0 && (
          <section className="friends-section">
            <h2>Friend Requests</h2>

            <div className="friends-grid">
              {requests.map((request) => (
                <div className="friend-card" key={request._id}>
                  <div className="friend-avatar large">
                    {avatar(request.from)}
                  </div>

                  <div className="friend-card-info">
                    <h3>{request.from?.username}</h3>
                    <p>{request.from?.email}</p>
                    <span>Wants to be friends</span>
                  </div>

                  <div className="friend-card-actions">
                    <button onClick={() => acceptRequest(request._id)}>
                      <Check size={17} />
                      Accept
                    </button>

                    <button
                      className="danger"
                      onClick={() => rejectRequest(request._id)}
                    >
                      <X size={17} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="friends-section">
          <h2>All Friends</h2>

          {friends.length === 0 ? (
            <div className="empty-friends-card">
              <UserPlus size={42} />
              <h3>No friends yet</h3>
              <p>Add a friend using their email address.</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div className="friend-card" key={friend._id}>
                  <div className="friend-avatar large">
                    {avatar(friend)}
                    <span className={`friend-status ${friend.status}`} />
                  </div>

                  <div className="friend-card-info">
                    <h3>{friend.username}</h3>
                    <p>{friend.email}</p>
                    <span>{friend.status}</span>
                  </div>

                  <div className="friend-card-actions">
                    <button onClick={() => navigate(`/dm/${friend._id}`)}>
                      <MessageCircle size={17} />
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
