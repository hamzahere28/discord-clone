import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Ban,
  BarChart3,
  CheckCircle2,
  Copy,
  Crown,
  Database,
  FileText,
  Hash,
  Link as LinkIcon,
  MessageSquare,
  Pin,
  RefreshCcw,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wifi,
  Zap
} from "lucide-react";
import API from "../api";

export default function ServerDashboard() {
  const { serverId } = useParams();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [messageFilter, setMessageFilter] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/servers/${serverId}/dashboard`);
      setStats(data);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to load dashboard");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text, label) => {
    await navigator.clipboard.writeText(text);
    alert(`${label} copied`);
  };

  const filteredMessages = useMemo(() => {
    if (!stats?.recentMessages) return [];

    return stats.recentMessages.filter((message) => {
      const content = message.content || "";
      const sender = message.sender?.username || "";
      const channel = message.channel?.name || "";

      return `${content} ${sender} ${channel}`
        .toLowerCase()
        .includes(messageFilter.toLowerCase());
    });
  }, [stats, messageFilter]);

  useEffect(() => {
    fetchStats();
  }, [serverId]);

  if (loading) {
    return (
      <div className="ultimate-dashboard-page">
        <div className="ultimate-loading-card">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) return null;

  const textChannels = stats.channels.filter((channel) => channel.type === "text");
  const voiceChannels = stats.channels.filter((channel) => channel.type === "voice");

  return (
    <div className="ultimate-dashboard-page">
      <aside className="ultimate-sidebar">
        <button className="ultimate-back-btn" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Server
        </button>

        <div className="ultimate-server-card">
          <div className="ultimate-server-icon">
            {stats.server.icon || stats.server.name.charAt(0)}
          </div>

          <div>
            <h3>{stats.server.name}</h3>
            <p>Server Dashboard</p>
          </div>
        </div>

        <div className="ultimate-nav-group">
          <span>Overview</span>

          <button
            className={activeSection === "overview" ? "active" : ""}
            onClick={() => setActiveSection("overview")}
          >
            <Activity size={17} />
            Overview
          </button>

          <button
            className={activeSection === "members" ? "active" : ""}
            onClick={() => setActiveSection("members")}
          >
            <Users size={17} />
            Members
          </button>

          <button
            className={activeSection === "channels" ? "active" : ""}
            onClick={() => setActiveSection("channels")}
          >
            <Hash size={17} />
            Channels
          </button>

          <button
            className={activeSection === "messages" ? "active" : ""}
            onClick={() => setActiveSection("messages")}
          >
            <MessageSquare size={17} />
            Messages
          </button>
        </div>

        <div className="ultimate-nav-group">
          <span>Management</span>

          <button
            className={activeSection === "roles" ? "active" : ""}
            onClick={() => setActiveSection("roles")}
          >
            <ShieldCheck size={17} />
            Roles
          </button>

          <button
            className={activeSection === "moderation" ? "active" : ""}
            onClick={() => setActiveSection("moderation")}
          >
            <Ban size={17} />
            Moderation
          </button>

          <button
            className={activeSection === "system" ? "active" : ""}
            onClick={() => setActiveSection("system")}
          >
            <Database size={17} />
            System
          </button>
        </div>

        <div className="ultimate-profile-mini">
          <div className="ultimate-mini-avatar">
            {stats.server.owner?.avatar || stats.server.owner?.username?.charAt(0) || "U"}
          </div>

          <div>
            <strong>{stats.server.owner?.username || "Owner"}</strong>
            <span>Owner</span>
          </div>
        </div>
      </aside>

      <main className="ultimate-main">
        <header className="ultimate-header">
          <div>
            <h1>{stats.server.name} Dashboard</h1>
            <p>Command Center</p>
          </div>

          <div className="ultimate-header-actions">
            <button onClick={fetchStats}>
              <RefreshCcw size={17} />
              Refresh
            </button>

            <button
              className="primary"
              onClick={() => copyText(stats.server.inviteCode, "Invite code")}
            >
              <Copy size={17} />
              Copy Invite
            </button>
          </div>
        </header>

        <section className="ultimate-hero">
          <div className="ultimate-hero-icon">
            {stats.server.icon || stats.server.name.charAt(0)}
          </div>

          <div className="ultimate-hero-info">
            <h2>
              {stats.server.name}
              <span>
                <Crown size={15} />
                Owner
              </span>
            </h2>

            <p>
              Owner: <strong>{stats.server.owner?.username || "Unknown"}</strong>
              <b>•</b>
              Server ID: {stats.server._id}
            </p>
          </div>

          <div className="ultimate-invite-card">
            <span>Invite Code</span>
            <strong>{stats.server.inviteCode}</strong>
            <button onClick={() => copyText(stats.server.inviteCode, "Invite code")}>
              <Copy size={16} />
            </button>
          </div>
        </section>

        <section className="ultimate-stat-grid">
          <div className="ultimate-stat-card purple">
            <Users size={27} />
            <div>
              <strong>{stats.counts.members}</strong>
              <span>Members</span>
              <small>Server population</small>
            </div>
          </div>

          <div className="ultimate-stat-card blue">
            <Hash size={27} />
            <div>
              <strong>{stats.counts.channels}</strong>
              <span>Channels</span>
              <small>{stats.counts.textChannels} text • {stats.counts.voiceChannels} voice</small>
            </div>
          </div>

          <div className="ultimate-stat-card green">
            <MessageSquare size={27} />
            <div>
              <strong>{stats.counts.messages}</strong>
              <span>Messages</span>
              <small>Total activity</small>
            </div>
          </div>

          <div className="ultimate-stat-card orange">
            <ShieldCheck size={27} />
            <div>
              <strong>{stats.counts.staff}</strong>
              <span>Staff</span>
              <small>Admins & mods</small>
            </div>
          </div>
        </section>

        {activeSection === "overview" && (
          <>
            <section className="ultimate-grid-2">
              <div className="ultimate-panel">
                <div className="ultimate-panel-header">
                  <h3>
                    <BarChart3 size={19} />
                    Activity Overview
                  </h3>
                  <span className="ultimate-badge">Messages</span>
                </div>

                <div className="fake-chart">
                  {[18, 44, 30, 58, 38, 72, 50].map((height, index) => (
                    <div key={index} style={{ height: `${height}%` }}>
                      <span />
                    </div>
                  ))}
                </div>

                <div className="chart-labels">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              <RecentMessagesPanel messages={filteredMessages.slice(0, 5)} />
            </section>

            <section className="ultimate-grid-3">
              <ChannelsPanel textChannels={textChannels} voiceChannels={voiceChannels} />
              <SystemHealthPanel />
              <QuickActionsPanel setActiveSection={setActiveSection} />
            </section>
          </>
        )}

        {activeSection === "members" && (
          <MembersSection members={stats.members} />
        )}

        {activeSection === "channels" && (
          <ChannelsSection channels={stats.channels} />
        )}

        {activeSection === "messages" && (
          <MessagesSection
            messages={filteredMessages}
            messageFilter={messageFilter}
            setMessageFilter={setMessageFilter}
          />
        )}

        {activeSection === "roles" && (
          <RolesSection members={stats.members} />
        )}

        {activeSection === "moderation" && (
          <ModerationSection />
        )}

        {activeSection === "system" && (
          <SystemSection stats={stats} copyText={copyText} />
        )}
      </main>
    </div>
  );
}

function RecentMessagesPanel({ messages }) {
  return (
    <div className="ultimate-panel">
      <div className="ultimate-panel-header">
        <h3>
          <Activity size={19} />
          Recent Messages
        </h3>
      </div>

      {messages.length === 0 && <p className="ultimate-empty">No messages yet.</p>}

      {messages.map((message) => (
        <div className="ultimate-message-row" key={message._id}>
          <div className="ultimate-avatar">
            {message.sender?.avatar || message.sender?.username?.charAt(0) || "U"}
          </div>

          <div>
            <strong>{message.sender?.username || "User"}</strong>
            <span>#{message.channel?.name || "channel"}</span>
            <p>{message.content || "Attachment / poll"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChannelsPanel({ textChannels, voiceChannels }) {
  const total = textChannels.length + voiceChannels.length;
  const textPercent = total ? Math.round((textChannels.length / total) * 100) : 0;

  return (
    <div className="ultimate-panel">
      <div className="ultimate-panel-header">
        <h3>
          <Hash size={19} />
          Channel Breakdown
        </h3>
      </div>

      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: `conic-gradient(#5865f2 0 ${textPercent}%, #22d3ee ${textPercent}% 100%)`
          }}
        >
          <div>{total}</div>
        </div>

        <div className="donut-info">
          <p>
            <b className="dot blue" /> Text Channels <span>{textChannels.length}</span>
          </p>
          <p>
            <b className="dot cyan" /> Voice Channels <span>{voiceChannels.length}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SystemHealthPanel() {
  return (
    <div className="ultimate-panel">
      <div className="ultimate-panel-header">
        <h3>
          <CheckCircle2 size={19} />
          Server Health
        </h3>
      </div>

      {[
        ["API Status", "Operational", Wifi],
        ["Database", "Operational", Database],
        ["WebSocket", "Operational", Zap],
        ["Media Services", "Operational", Activity]
      ].map(([title, value, Icon]) => (
        <div className="health-row" key={title}>
          <div>
            <Icon size={16} />
            <span>{title}</span>
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function QuickActionsPanel({ setActiveSection }) {
  return (
    <div className="ultimate-panel">
      <div className="ultimate-panel-header">
        <h3>
          <Zap size={19} />
          Quick Actions
        </h3>
      </div>

      <div className="quick-action-grid">
        <button onClick={() => setActiveSection("members")}>
          <Users size={20} />
          Manage Members
        </button>

        <button onClick={() => setActiveSection("channels")}>
          <Hash size={20} />
          View Channels
        </button>

        <button onClick={() => setActiveSection("roles")}>
          <ShieldCheck size={20} />
          Roles
        </button>

        <button className="danger" onClick={() => setActiveSection("moderation")}>
          <Ban size={20} />
          Moderation
        </button>
      </div>
    </div>
  );
}

function MembersSection({ members }) {
  return (
    <div className="ultimate-panel full">
      <div className="ultimate-panel-header">
        <h3>
          <Users size={19} />
          Members
        </h3>
      </div>

      <div className="ultimate-table">
        {members.map((member) => (
          <div className="ultimate-table-row" key={member.user?._id}>
            <div className="ultimate-avatar">
              {member.user?.avatar || member.user?.username?.charAt(0)}
            </div>
            <strong>{member.user?.username}</strong>
            <span>{member.user?.email}</span>
            <small className={`role-pill ${member.role}`}>{member.role}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsSection({ channels }) {
  return (
    <div className="ultimate-panel full">
      <div className="ultimate-panel-header">
        <h3>
          <Hash size={19} />
          Channels
        </h3>
      </div>

      <div className="ultimate-table">
        {channels.map((channel) => (
          <div className="ultimate-table-row" key={channel._id}>
            <Hash size={20} />
            <strong>#{channel.name}</strong>
            <span>{channel.type}</span>
            <small>{new Date(channel.createdAt).toLocaleDateString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSection({ messages, messageFilter, setMessageFilter }) {
  return (
    <div className="ultimate-panel full">
      <div className="ultimate-panel-header">
        <h3>
          <MessageSquare size={19} />
          Message Explorer
        </h3>

        <input
          className="dashboard-search-input"
          placeholder="Search messages..."
          value={messageFilter}
          onChange={(e) => setMessageFilter(e.target.value)}
        />
      </div>

      {messages.map((message) => (
        <div className="ultimate-message-row big" key={message._id}>
          <div className="ultimate-avatar">
            {message.sender?.avatar || message.sender?.username?.charAt(0) || "U"}
          </div>

          <div>
            <strong>{message.sender?.username || "User"}</strong>
            <span>#{message.channel?.name || "channel"}</span>
            <p>{message.content || "Attachment / poll"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RolesSection({ members }) {
  const counts = members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="ultimate-grid-3">
      {["owner", "admin", "moderator", "member"].map((role) => (
        <div className="ultimate-panel" key={role}>
          <ShieldCheck size={24} />
          <h3>{role}</h3>
          <p>{counts[role] || 0} users have this role.</p>
        </div>
      ))}
    </div>
  );
}

function ModerationSection() {
  return (
    <div className="ultimate-grid-3">
      <div className="ultimate-panel warning">
        <Ban size={25} />
        <h3>Bans</h3>
        <p>View and manage banned users from server settings.</p>
      </div>

      <div className="ultimate-panel warning">
        <AlertTriangle size={25} />
        <h3>Warnings</h3>
        <p>Coming soon: warn users and store moderation history.</p>
      </div>

      <div className="ultimate-panel warning">
        <FileText size={25} />
        <h3>Audit Log</h3>
        <p>Coming soon: view server actions and admin logs.</p>
      </div>
    </div>
  );
}

function SystemSection({ stats, copyText }) {
  return (
    <div className="ultimate-grid-2">
      <div className="ultimate-panel">
        <h3>Server Info</h3>

        <div className="info-row">
          <span>Server ID</span>
          <button onClick={() => copyText(stats.server._id, "Server ID")}>
            {stats.server._id}
            <Copy size={15} />
          </button>
        </div>

        <div className="info-row">
          <span>Invite Code</span>
          <button onClick={() => copyText(stats.server.inviteCode, "Invite code")}>
            {stats.server.inviteCode}
            <Copy size={15} />
          </button>
        </div>
      </div>

      <SystemHealthPanel />
    </div>
  );
}