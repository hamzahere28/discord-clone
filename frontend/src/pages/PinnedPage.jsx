import { ArrowLeft, Pin, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function PinnedPage() {
  const navigate = useNavigate();
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPinnedMessages = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/messages/pinned/all");
      setPinnedMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Fetch pinned messages error:", error.response?.data || error);
      setPinnedMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinnedMessages();
  }, []);

  return (
    <div className="feature-page">
      <div className="feature-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="feature-header-card">
          <div className="feature-icon">
            <Pin size={34} />
          </div>

          <div>
            <h1>Pinned Messages</h1>
            <p>Important messages saved from your channels.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-friends-card">
            <h3>Loading pinned messages...</h3>
          </div>
        ) : pinnedMessages.length === 0 ? (
          <div className="empty-friends-card">
            <Pin size={42} />
            <h3>No pinned messages yet</h3>
            <p>Pin a message from the message menu to see it here.</p>
          </div>
        ) : (
          <div className="pinned-list">
            {pinnedMessages.map((message) => (
              <div className="pinned-card" key={message._id}>
                <div className="pinned-card-top">
                  <div className="friend-avatar">
                    {message.sender?.avatar ||
                      message.sender?.username?.charAt(0) ||
                      "U"}
                  </div>

                  <div>
                    <strong>{message.sender?.username || "User"}</strong>
                    <span>
                      {new Date(message.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p>{message.content || "Attachment message"}</p>

                <div className="pinned-location">
                  <Hash size={15} />
                  <span>
                    {message.server?.name || "Server"} /{" "}
                    {message.channel?.name || "channel"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}