import { Users, ArrowLeft, Crown, MessageCircle, Search, UserPlus } from "lucide-react";
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

const getStoredUser = () => {
  const savedUser = localStorage.getItem("discord_user");

  if (!savedUser || savedUser === "undefined") {
    localStorage.removeItem("discord_user");
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("discord_user");
    return null;
  }
};

export default function MembersPage() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/friends");
      setFriends(data.friends || []);
    } catch (error) {
      console.log("Members error:", error.response?.data || error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const allMembers = useMemo(() => {
    const currentUser = user
      ? [{ ...user, _id: user._id || "me", roleLabel: "You", self: true }]
      : [];

    return [...currentUser, ...friends.map((friend) => ({ ...friend, roleLabel: "Friend" }))];
  }, [friends, user]);

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allMembers;

    return allMembers.filter((member) =>
      `${member.username || ""} ${member.email || ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [allMembers, query]);

  const avatar = (member) => {
    if (member?.avatarUrl) {
      return (
        <img
          src={getAvatarUrl(member.avatarUrl)}
          alt=""
          className="friend-avatar-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return member?.avatar || member?.username?.charAt(0) || "U";
  };

  return (
    <div className="feature-page app-final-page">
      <div className="feature-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="feature-header-card final-feature-header">
          <div className="feature-icon">
            <Users size={32} />
          </div>

          <div>
            <h1>Members</h1>
            <p>Browse your people, check status, and start private messages.</p>
          </div>
        </div>

        <div className="feature-action-bar">
          <div className="feature-search">
            <Search size={16} />
            <input
              placeholder="Search members"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button onClick={() => navigate("/friends")}>
            <UserPlus size={17} />
            Manage Friends
          </button>
        </div>

        {loading ? (
          <div className="empty-friends-card">
            <h3>Loading members...</h3>
          </div>
        ) : (
          <div className="member-directory">
            {filteredMembers.map((member) => (
              <div className="member-directory-row" key={member._id || member.email}>
                <div className="friend-avatar large">
                  {avatar(member)}
                  <span className={`friend-status ${member.status || "offline"}`} />
                </div>

                <div>
                  <strong>
                    {member.username || "User"}
                    {member.self && <Crown size={15} />}
                  </strong>
                  <p>{member.email}</p>
                  <span>{member.roleLabel || member.status || "Member"}</span>
                </div>

                {!member.self ? (
                  <button onClick={() => navigate(`/dm/${member._id}`)}>
                    <MessageCircle size={17} />
                    Message
                  </button>
                ) : (
                  <button onClick={() => navigate("/friends")}>
                    <UserPlus size={17} />
                    Add People
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
