import { Bell, ArrowLeft, Inbox, Pin, UserPlus, CheckCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DEFAULT_NOTIFICATIONS = [
  {
    id: "dm",
    title: "Direct messages are ready",
    body: "Open Inbox to continue private conversations with your friends.",
    time: "Now",
    action: "Open Inbox",
    route: "/inbox",
    icon: Inbox
  },
  {
    id: "pins",
    title: "Pinned messages",
    body: "Review important server messages saved from your channels.",
    time: "Today",
    action: "View Pins",
    route: "/pinned",
    icon: Pin
  },
  {
    id: "friends",
    title: "Grow your community",
    body: "Add friends by email and start a direct message instantly.",
    time: "Suggested",
    action: "Add Friend",
    route: "/friends",
    icon: UserPlus
  }
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [readIds, setReadIds] = useState([]);

  const markRead = (id) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const unreadCount = DEFAULT_NOTIFICATIONS.length - readIds.length;

  return (
    <div className="feature-page app-final-page">
      <div className="feature-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="feature-header-card final-feature-header">
          <div className="feature-icon">
            <Bell size={32} />
          </div>

          <div>
            <h1>Notifications</h1>
            <p>Actionable alerts for inbox, pinned messages, and friends.</p>
          </div>
        </div>

        <div className="feature-stats-row">
          <div>
            <strong>{unreadCount}</strong>
            <span>Unread</span>
          </div>
          <div>
            <strong>{readIds.length}</strong>
            <span>Handled</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Notification center</span>
          </div>
        </div>

        <div className="notification-list">
          {DEFAULT_NOTIFICATIONS.map((item) => {
            const Icon = item.icon;
            const isRead = readIds.includes(item.id);

            return (
              <div
                className={isRead ? "notification-card read" : "notification-card"}
                key={item.id}
              >
                <div className="notification-icon">
                  <Icon size={20} />
                </div>

                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <span>{item.time}</span>
                </div>

                <div className="notification-actions">
                  <button onClick={() => navigate(item.route)}>
                    {item.action}
                  </button>
                  <button className="ghost" onClick={() => markRead(item.id)}>
                    <CheckCheck size={16} />
                    {isRead ? "Read" : "Mark Read"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
