import {
  Inbox,
  ArrowLeft,
  MessageCircle,
  UserPlus,
  Search,
  Clock,
  Bell,
  Home,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") || avatarUrl.startsWith("blob:")) {
    return avatarUrl;
  }
  return `${BACKEND_URL}${avatarUrl}`;
};

export default function InboxPage() {
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/friends");
      setFriends(data.friends || []);
      setRequests(data.requests || []);
    } catch (error) {
      console.log("Inbox error:", error.response?.data || error);
      setFriends([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const filteredFriends = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return friends;

    return friends.filter((friend) =>
      `${friend.username || ""} ${friend.email || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [friends, query]);

  const avatar = (friend) => {
    if (friend?.avatarUrl) {
      return (
        <img
          src={getAvatarUrl(friend.avatarUrl)}
          alt=""
          className="friend-avatar-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return friend?.avatar || friend?.username?.charAt(0) || "U";
  };

  return (
    <div className="feature-page app-final-page mobile-messages-page">
      <div className="mobile-dm-rail" aria-hidden="true">
        <div className="mobile-dm-rail-home">
          <MessageCircle size={23} />
        </div>

        {friends.slice(0, 7).map((friend) => (
          <div className="mobile-dm-rail-avatar" key={friend._id}>
            {avatar(friend)}
          </div>
        ))}

        <button type="button">
          <UserPlus size={22} />
        </button>
      </div>

      <div className="feature-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="feature-header-card final-feature-header">
          <div className="feature-icon">
            <Inbox size={32} />
          </div>

          <div>
            <h1>Inbox</h1>
            <p>Open your direct messages, friend requests, and private chats.</p>
          </div>
        </div>

        <div className="feature-action-bar">
          <div className="feature-search">
            <Search size={16} />
            <input
              placeholder="Search direct messages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button onClick={() => navigate("/friends")}>
            <UserPlus size={17} />
            Add Friend
          </button>
        </div>

        <div className="feature-stats-row">
          <div>
            <strong>{friends.length}</strong>
            <span>DM contacts</span>
          </div>
          <div>
            <strong>{requests.length}</strong>
            <span>Requests</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Inbox status</span>
          </div>
        </div>

        {loading ? (
          <div className="empty-friends-card">
            <h3>Loading inbox...</h3>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="empty-friends-card">
            <MessageCircle size={42} />
            <h3>No direct messages yet</h3>
            <p>Add a friend to start private conversations from this inbox.</p>
            <button onClick={() => navigate("/friends")}>
              <UserPlus size={17} />
              Find Friends
            </button>
          </div>
        ) : (
          <div className="dm-hub-list">
            {filteredFriends.map((friend) => (
              <button
                className="dm-hub-row"
                key={friend._id}
                onClick={() => navigate(`/dm/${friend._id}`)}
              >
                <div className="friend-avatar large">
                  {avatar(friend)}
                  <span className={`friend-status ${friend.status}`} />
                </div>

                <div>
                  <strong>{friend.username}</strong>
                  <p>{friend.email}</p>
                  <span>
                    <Clock size={13} />
                    Ready to message
                  </span>
                </div>

                <div className="dm-hub-action">
                  <MessageCircle size={17} />
                  Open DM
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mobile-dm-bottom-nav">
        <button type="button" onClick={() => navigate("/")}>
          <Home size={22} />
          <span>Home</span>
        </button>

        <button type="button" onClick={() => navigate("/notifications")}>
          <Bell size={22} />
          <span>Notifications</span>
        </button>

        <button type="button" onClick={() => navigate("/members")}>
          <UserRound size={22} />
          <span>You</span>
        </button>
      </div>
    </div>
  );
}
