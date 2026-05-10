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
    Smile
  } from "lucide-react";
  
  import { useState } from "react";
  import API from "../api";
  import { useAuth } from "../context/authContext";
  import Modal from "./Modal";
  import ProfileModal from "./ProfileModal";
  
  export default function ChannelSidebar({
    server,
    channels,
    activeChannel,
    setActiveChannel,
    refreshChannels
  }) {
    const { user, logout } = useAuth();
  
    const [showCreate, setShowCreate] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [channelName, setChannelName] = useState("");
  
    const createChannel = async (e) => {
      e.preventDefault();
  
      await API.post(`/channels/${server._id}`, {
        name: channelName,
        type: "text"
      });
  
      setChannelName("");
      setShowCreate(false);
      refreshChannels();
    };
  
    const copyInvite = () => {
      navigator.clipboard.writeText(server.inviteCode);
    };
  
    if (!server) {
      return (
        <div className="channel-sidebar empty">
          <h3>No servers yet</h3>
          <p>Create or join a server to start chatting.</p>
        </div>
      );
    }
  
    return (
      <div className="channel-sidebar enhanced-sidebar">
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
          <button title="Notifications">
            <Bell size={17} />
          </button>
  
          <button title="Members">
            <UserRound size={17} />
          </button>
  
          <button title="Settings">
            <Settings size={17} />
          </button>
        </div>
  
        <div className="invite-card">
          <span>Invite Code</span>
          <strong>{server.inviteCode}</strong>
          <button onClick={copyInvite}>Copy</button>
        </div>
  
        <div className="channel-section-title">
          <span>Text Channels</span>
          <button onClick={() => setShowCreate(true)}>
            <Plus size={15} />
          </button>
        </div>
  
        <div className="channel-list">
          {channels.map((channel) => (
            <button
              key={channel._id}
              className={
                activeChannel?._id === channel._id
                  ? "channel-item active"
                  : "channel-item"
              }
              onClick={() => setActiveChannel(channel)}
            >
              {channel.type === "voice" ? (
                <Volume2 size={18} />
              ) : (
                <Hash size={18} />
              )}
  
              <span>{channel.name}</span>
  
              {activeChannel?._id === channel._id && (
                <Smile size={15} className="channel-extra-icon" />
              )}
            </button>
          ))}
        </div>
  
        <div className="user-panel improved-user-panel">
          <div className="avatar">
            {user?.avatar}
            <span className={`mini-status ${user?.status}`} />
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
              <p>Add a new text channel to this server.</p>
  
              <input
                placeholder="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                required
              />
  
              <button>Create channel</button>
            </form>
          </Modal>
        )}
  
        {showProfile && (
          <ProfileModal onClose={() => setShowProfile(false)} />
        )}
      </div>
    );
  }