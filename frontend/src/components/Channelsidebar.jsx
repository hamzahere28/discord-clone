import {
  Hash,
  Plus,
  Volume2,
  LogOut,
  Copy,
  Settings,
  UserRound,
  Bell,
  Search,
  Smile,
  Mic,
  X,
  PhoneOff,
  MicOff,
  Headphones,
  Bug,
  ShieldCheck,
  Signal,
  Users
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";
import ProfileModal from "./ProfileModal";
import ServerSettingsModal from "./ServerSettingsModal";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") || avatarUrl.startsWith("blob:")) {
    return avatarUrl;
  }
  return `${BACKEND_URL}${avatarUrl}`;
};

export default function ChannelSidebar({
  server,
  channels,
  activeChannel,
  setActiveChannel,
  refreshChannels,
  refreshServers,
  unreadCounts,
  mobileSidebarOpen,
  closeMobileSidebar,
  voiceChannel,
  voiceUsers,
  voiceMuted,
  voiceDeafened,
  voiceConnecting,
  voiceError,
  voiceDebugOpen,
  setVoiceDebugOpen,
  peerCount,
  speaking,
  micStatus,
  joinVoiceChannel,
  leaveVoiceChannel,
  toggleVoiceMute,
  toggleVoiceDeafen
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");

  const getAvatar = (targetUser) => {
    if (targetUser?.avatarUrl) {
      return (
        <img
          src={getAvatarUrl(targetUser.avatarUrl)}
          alt=""
          className="sidebar-avatar-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return targetUser?.avatar || targetUser?.username?.charAt(0) || "U";
  };

  const createChannel = async (e) => {
    e.preventDefault();

    await API.post(`/channels/${server._id}`, {
      name: channelName,
      type: channelType
    });

    setChannelName("");
    setChannelType("text");
    setShowCreate(false);
    refreshChannels();
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(server.inviteCode);
    alert("Invite code copied");
  };

  if (!server) {
    return (
      <div
        className={
          mobileSidebarOpen
            ? "channel-sidebar empty mobile-open"
            : "channel-sidebar empty"
        }
      >
        <button
          className="mobile-close-sidebar"
          type="button"
          onClick={closeMobileSidebar}
        >
          <X size={18} />
        </button>

        <h3>No servers yet</h3>
        <p>Create or join a server to start chatting.</p>
      </div>
    );
  }

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  return (
    <div
      className={
        mobileSidebarOpen
          ? "channel-sidebar enhanced-sidebar mobile-open"
          : "channel-sidebar enhanced-sidebar"
      }
    >
      <button
        className="mobile-close-sidebar"
        type="button"
        onClick={closeMobileSidebar}
      >
        <X size={18} />
      </button>

      <div className="server-hero">
        <div>
          <h3>{server.name}</h3>
          <p>{server.members?.length || 0} members</p>
        </div>

        <button onClick={copyInvite} title="Copy invite code">
          <Copy size={17} />
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={15} />
        <input placeholder="Search channels" />
      </div>

      <div className="quick-actions">
        <button title="Notifications" onClick={() => navigate("/notifications")}>
          <Bell size={17} />
          <span>Alerts</span>
        </button>

        <button title="Members" onClick={() => navigate("/members")}>
          <UserRound size={17} />
          <span>Members</span>
        </button>

        <button
          title="Server Dashboard"
          onClick={() => navigate(`/dashboard/${server._id}`)}
        >
          <ShieldCheck size={17} />
          <span>Dashboard</span>
        </button>

        <button
          title="Server Settings"
          onClick={() => setShowServerSettings(true)}
        >
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </div>

      <div className="invite-card">
        <span>Invite Code</span>
        <strong>{server.inviteCode}</strong>
        <button onClick={copyInvite}>Copy</button>
      </div>

      <div className="channel-section-title">
        <span>Text Channels</span>

        <button
          onClick={() => {
            setChannelType("text");
            setShowCreate(true);
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="channel-list compact">
        {textChannels.map((channel) => (
          <button
            key={channel._id}
            className={
              activeChannel?._id === channel._id
                ? "channel-item active"
                : "channel-item"
            }
            onClick={() => setActiveChannel(channel)}
          >
            <Hash size={18} />
            <span>{channel.name}</span>

            {unreadCounts?.[channel._id] > 0 &&
              activeChannel?._id !== channel._id && (
                <small className="unread-badge">
                  {unreadCounts[channel._id]}
                </small>
              )}

            {activeChannel?._id === channel._id && (
              <Smile size={15} className="channel-extra-icon" />
            )}
          </button>
        ))}
      </div>

      <div className="channel-section-title">
        <span>Voice Channels</span>

        <button
          onClick={() => {
            setChannelType("voice");
            setShowCreate(true);
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="channel-list compact">
        {voiceChannels.map((channel) => {
          const isActiveVoice = voiceChannel?._id === channel._id;
          const usersInThisChannel = isActiveVoice ? voiceUsers : [];

          return (
            <div key={channel._id} className="voice-channel-block">
              <button
                className={
                  isActiveVoice
                    ? "channel-item voice active"
                    : "channel-item voice"
                }
                disabled={voiceConnecting}
                onClick={() => joinVoiceChannel(channel, user)}
              >
                <div className="voice-channel-main">
                  <Volume2 size={18} />
                  <span>{channel.name}</span>
                </div>

                <div className="voice-channel-meta">
                  <Users size={13} />
                  <small>{usersInThisChannel.length}</small>
                </div>

                {voiceConnecting && isActiveVoice && (
                  <small className="voice-live-dot">Connecting</small>
                )}

                {isActiveVoice && !voiceConnecting && (
                  <small className="voice-live-dot">Live</small>
                )}
              </button>

              {usersInThisChannel.length > 0 && (
                <div className="voice-users-list">
                  {usersInThisChannel.map((voiceUser) => (
                    <div
                      className={
                        speaking && voiceUser._id === user?._id
                          ? "voice-user-row speaking"
                          : "voice-user-row"
                      }
                      key={voiceUser.socketId}
                    >
                      <div className="voice-user-avatar">
                        {getAvatar(voiceUser)}
                      </div>

                      <span>{voiceUser.username}</span>

                      {voiceUser.muted && <MicOff size={13} />}
                      {voiceUser.deafened && <Headphones size={13} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {voiceError && <div className="voice-error-box">{voiceError}</div>}

      {voiceChannel && (
        <div className="voice-control-panel upgraded-voice-control">
          <div className="voice-connection-status">
            <Signal size={16} />
            <strong>
              {speaking && !voiceMuted ? "Speaking" : "Voice Connected"}
            </strong>
            <span>{voiceChannel.name}</span>
          </div>

          <div className="voice-control-buttons">
            <button
              className={voiceMuted ? "active" : ""}
              onClick={toggleVoiceMute}
              title="Mute"
            >
              {voiceMuted ? <MicOff size={16} /> : <Mic size={16} />}
              <span>{voiceMuted ? "Muted" : "Mic"}</span>
            </button>

            <button
              className={voiceDeafened ? "active" : ""}
              onClick={toggleVoiceDeafen}
              title="Deafen"
            >
              <Headphones size={16} />
              <span>Audio</span>
            </button>

            <button
              className={voiceDebugOpen ? "active" : ""}
              onClick={() => setVoiceDebugOpen(!voiceDebugOpen)}
              title="Voice Debug"
            >
              <Bug size={16} />
              <span>Debug</span>
            </button>

            <button className="danger" onClick={leaveVoiceChannel} title="Leave">
              <PhoneOff size={16} />
              <span>Leave</span>
            </button>
          </div>

          {voiceDebugOpen && (
            <div className="voice-debug-panel">
              <div>
                <span>Mic</span>
                <strong>{micStatus}</strong>
              </div>

              <div>
                <span>Voice Users</span>
                <strong>{voiceUsers.length}</strong>
              </div>

              <div>
                <span>Peers</span>
                <strong>{peerCount}</strong>
              </div>

              <div>
                <span>Muted</span>
                <strong>{voiceMuted ? "yes" : "no"}</strong>
              </div>

              <div>
                <span>Deafened</span>
                <strong>{voiceDeafened ? "yes" : "no"}</strong>
              </div>

              <div>
                <span>Speaking</span>
                <strong>{speaking ? "yes" : "no"}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="user-panel improved-user-panel">
        <div className="avatar image-avatar">
          {getAvatar(user)}
          <span className={`mini-status ${user?.status || "offline"}`} />
        </div>

        <div>
          <strong>{user?.username}</strong>
          <span>{user?.status}</span>
        </div>

        <button onClick={() => setShowProfile(true)} title="Edit profile">
          <Settings size={18} />
        </button>

        <button onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>

      {showCreate && (
        <Modal title="Create channel" onClose={() => setShowCreate(false)}>
          <form className="modal-form" onSubmit={createChannel}>
            <p>
              Create a new {channelType === "voice" ? "voice" : "text"} channel.
            </p>

            <input
              placeholder="channel-name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              required
            />

            <div className="channel-type-switch">
              <button
                type="button"
                className={channelType === "text" ? "active" : ""}
                onClick={() => setChannelType("text")}
              >
                <Hash size={16} />
                Text
              </button>

              <button
                type="button"
                className={channelType === "voice" ? "active" : ""}
                onClick={() => setChannelType("voice")}
              >
                <Mic size={16} />
                Voice
              </button>
            </div>

            <button type="submit">Create channel</button>
          </form>
        </Modal>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {showServerSettings && (
        <ServerSettingsModal
          server={server}
          onClose={() => setShowServerSettings(false)}
          refreshServers={refreshServers}
        />
      )}
    </div>
  );
}
