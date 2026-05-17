import {
  Hash,
  Send,
  Pin,
  Bell,
  Users,
  Search,
  Settings,
  Inbox,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
  Check,
  Paperclip,
  Menu,
  MessageCircle,
  UserPlus,
  Reply,
  ArrowDown,
  Copy,
  Sparkles
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import socket from "../socket";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const QUICK_REACTIONS = ["\u{1F44D}", "\u{1F602}", "\u2764\uFE0F", "\u{1F525}", "\u{1F62E}"];

const getAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") || avatarUrl.startsWith("blob:")) {
    return avatarUrl;
  }
  return `${BACKEND_URL}${avatarUrl}`;
};

export default function ChatWindow({ server, channel, openMobileSidebar }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [file, setFile] = useState(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [friendActionMessage, setFriendActionMessage] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const messagesAreaRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto"
    });
  };

  const checkScrollPosition = () => {
    const el = messagesAreaRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 220);
  };

  const fetchMessages = async () => {
    if (!channel) return;

    try {
      const { data } = await API.get(`/messages/${channel._id}?limit=50`);
      const list = Array.isArray(data) ? data : [];

      setMessages(list);
      setHasMoreMessages(list.length === 50);

      setTimeout(() => scrollToBottom(false), 100);
    } catch (error) {
      console.log("Fetch messages error:", error.response?.data || error);
      setMessages([]);
      setHasMoreMessages(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!channel || messages.length === 0 || loadingOlder) return;

    const el = messagesAreaRef.current;
    const oldScrollHeight = el?.scrollHeight || 0;

    try {
      setLoadingOlder(true);

      const oldestMessage = messages[0];

      const { data } = await API.get(
        `/messages/${channel._id}?limit=50&before=${oldestMessage.createdAt}`
      );

      const olderMessages = Array.isArray(data) ? data : [];

      setMessages((prev) => {
        const existingIds = new Set(prev.map((msg) => msg._id));
        const uniqueOlder = olderMessages.filter(
          (msg) => !existingIds.has(msg._id)
        );

        return [...uniqueOlder, ...prev];
      });

      setHasMoreMessages(olderMessages.length === 50);

      setTimeout(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - oldScrollHeight;
        }
      }, 50);
    } catch (error) {
      console.log("Load older messages error:", error.response?.data || error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!content.trim() && !file) return;

    const formData = new FormData();
    formData.append("content", content.trim());

    if (replyingTo?._id) {
      formData.append("replyTo", replyingTo._id);
    }

    if (file) {
      formData.append("file", file);
    }

    await API.post(`/messages/${channel._id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    setContent("");
    setFile(null);
    setReplyingTo(null);

    setTimeout(() => scrollToBottom(true), 80);
  };

  const reactToMessage = async (messageId, emoji) => {
    await API.put(`/messages/${messageId}/reactions`, { emoji });
  };

  const togglePinMessage = async (messageId) => {
    await API.put(`/messages/${messageId}/pin`);
    setOpenMenu(null);
  };

  const startEdit = (message) => {
    setEditingId(message._id);
    setEditingText(message.content);
    setOpenMenu(null);
  };

  const startReply = (message) => {
    setReplyingTo(message);
    setOpenMenu(null);
  };

  const copyMessage = async (message) => {
    if (!message?.content) return;

    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message._id);
    setOpenMenu(null);

    setTimeout(() => {
      setCopiedMessageId(null);
    }, 1400);
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim()) return;

    await API.put(`/messages/${messageId}`, {
      content: editingText.trim()
    });

    setEditingId(null);
    setEditingText("");
  };

  const deleteMessage = async (messageId) => {
    const ok = confirm("Delete this message?");
    if (!ok) return;

    await API.delete(`/messages/${messageId}`);
    setOpenMenu(null);
  };

  const handleTyping = () => {
    if (!channel || !user) return;

    if (typingTimeoutRef.current) return;

    socket.emit("typing", {
      channelId: channel._id,
      username: user.username
    });

    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const getAvatar = (sender) => {
    if (sender?.avatarUrl) {
      return (
        <img
          src={getAvatarUrl(sender.avatarUrl)}
          alt=""
          className="message-avatar-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return sender?.avatar || sender?.username?.charAt(0) || "U";
  };

  const getReplyPreviewText = (message) => {
    if (!message) return "Message";

    if (message.content) {
      return message.content.length > 80
        ? `${message.content.slice(0, 80)}...`
        : message.content;
    }

    if (message.fileUrl) return "Attachment";
    return "Message";
  };

  const renderFile = (message) => {
    if (!message.fileUrl) return null;

    const url = `${BACKEND_URL}${message.fileUrl}`;

    if (message.fileType?.startsWith("image/")) {
      return (
        <img
          src={url}
          alt="file"
          className="chat-file-img"
          loading="lazy"
        />
      );
    }

    return (
      <a href={url} target="_blank" className="chat-file-link">
        Open attachment
      </a>
    );
  };

  const openProfile = (sender) => {
    if (!sender) return;
    setFriendActionMessage("");
    setSelectedProfile(sender);
  };

  const goToDM = (profileUser) => {
    if (!profileUser?._id) return;

    setSelectedProfile(null);
    navigate(`/dm/${profileUser._id}`);
  };

  const sendFriendRequestFromPopup = async (profileUser) => {
    if (!profileUser?._id) return;

    try {
      setAddingFriend(true);
      setFriendActionMessage("");

      const { data } = await API.post("/friends/request", {
        userId: profileUser._id
      });

      setFriendActionMessage(data.message || "Friend request sent");
    } catch (error) {
      setFriendActionMessage(
        error.response?.data?.message || "Failed to send request"
      );
    } finally {
      setAddingFriend(false);
    }
  };

  useEffect(() => {
    if (!channel) return;

    fetchMessages();
    setReplyingTo(null);

    socket.emit("join-channel", channel._id);

    socket.on("new-message", (message) => {
      const messageChannelId =
        typeof message.channel === "object"
          ? message.channel._id
          : message.channel;

      if (messageChannelId === channel._id) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg._id === message._id);
          if (exists) return prev;

          const el = messagesAreaRef.current;
          const shouldAutoScroll =
            !el || el.scrollHeight - el.scrollTop - el.clientHeight < 220;

          setTimeout(() => {
            if (shouldAutoScroll) scrollToBottom(true);
          }, 80);

          return [...prev, message];
        });
      }
    });

    socket.on("message-updated", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        )
      );
    });

    socket.on("message-deleted", (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    socket.on("typing", (username) => {
      setTypingUser(username);

      setTimeout(() => {
        setTypingUser("");
      }, 1200);
    });

    return () => {
      socket.emit("leave-channel", channel._id);
      socket.off("new-message");
      socket.off("message-updated");
      socket.off("message-deleted");
      socket.off("typing");

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [channel]);

  const filteredMessages = messages.filter((message) =>
    message.content?.toLowerCase().includes(search.toLowerCase())
  );

  if (!server) {
    return (
      <main className="chat-window empty-chat">
        <h2>Welcome to Discord Clone</h2>
        <p>Create a server or join one to start chatting.</p>
      </main>
    );
  }

  if (!channel) {
    return (
      <main className="chat-window empty-chat">
        <button
          className="mobile-sidebar-btn"
          type="button"
          onClick={openMobileSidebar}
        >
          <Menu size={20} />
        </button>

        <h2>No channel selected</h2>
        <p>Create or select a text channel.</p>
      </main>
    );
  }

  return (
    <main className="chat-window upgraded-chat-window">
      {selectedProfile && (
        <div
          className="profile-popup-overlay"
          onClick={() => setSelectedProfile(null)}
        >
          <div
            className="profile-popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="profile-popup-close"
              onClick={() => setSelectedProfile(null)}
            >
              <X size={18} />
            </button>

            <div className="profile-popup-banner" />

            <div className="profile-popup-avatar">
              {getAvatar(selectedProfile)}
              <span
                className={`profile-status-dot ${
                  selectedProfile.status || "offline"
                }`}
              />
            </div>

            <div className="profile-popup-info">
              <h2>{selectedProfile.username || "User"}</h2>
              <p>{selectedProfile.status || "offline"}</p>

              <div className="profile-popup-meta">
                <span>User ID</span>
                <strong>{selectedProfile._id}</strong>
              </div>

              {friendActionMessage && (
                <div className="profile-popup-message">
                  {friendActionMessage}
                </div>
              )}

              <div className="profile-popup-actions">
                {selectedProfile._id !== user?._id && (
                  <button onClick={() => goToDM(selectedProfile)}>
                    <MessageCircle size={16} />
                    Message
                  </button>
                )}

                {selectedProfile._id !== user?._id && (
                  <button
                    onClick={() => sendFriendRequestFromPopup(selectedProfile)}
                    disabled={addingFriend}
                  >
                    <UserPlus size={16} />
                    {addingFriend ? "Sending..." : "Add Friend"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="chat-header upgraded-chat-header premium-chat-header">
        <div className="chat-title-block">
          <button
            className="mobile-sidebar-btn"
            type="button"
            onClick={openMobileSidebar}
          >
            <Menu size={20} />
          </button>

          <div className="chat-hash-badge">
            <Hash size={24} />
          </div>

          <div>
            <h2>{channel.name}</h2>
            <p>Server: {server.name}</p>
          </div>

          <button
            className="mobile-dm-top-btn"
            type="button"
            onClick={() => navigate("/inbox")}
          >
            <MessageCircle size={18} />
            DMs
          </button>
        </div>

        <div className="chat-toolbar">
          <button
            className="chat-tool-btn"
            type="button"
            onClick={() => navigate("/notifications")}
          >
            <Bell size={19} />
            <span>Alerts</span>
          </button>

          <button
            className="chat-tool-btn"
            type="button"
            onClick={() => navigate("/pinned")}
          >
            <Pin size={19} />
            <span>Pins</span>
          </button>

          <button
            className="chat-tool-btn"
            type="button"
            onClick={() => navigate("/members")}
          >
            <Users size={19} />
            <span>Members</span>
          </button>

          <button
            className="chat-tool-btn"
            type="button"
            onClick={() => navigate(`/dashboard/${server._id}`)}
          >
            <ShieldCheck size={19} />
            <span>Dashboard</span>
          </button>

          <div className="chat-search-box">
            <Search size={15} />
            <input
              placeholder="Search messages"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="chat-tool-btn"
            type="button"
            onClick={() => navigate("/inbox")}
          >
            <Inbox size={19} />
            <span>Inbox</span>
          </button>
        </div>
      </div>

      <div className="mobile-channel-strip">
        <div>
          <Sparkles size={15} />
          <span>{filteredMessages.length} messages</span>
        </div>

        {typingUser ? (
          <strong>{typingUser} is typing</strong>
        ) : (
          <strong>{server.members?.length || 0} members</strong>
        )}
      </div>

      <div
        className="messages-area premium-messages-area"
        ref={messagesAreaRef}
        onScroll={checkScrollPosition}
      >
        {hasMoreMessages && !search && (
          <div className="load-older-box">
            <button type="button" onClick={loadOlderMessages}>
              {loadingOlder ? "Loading..." : "Load older messages"}
            </button>
          </div>
        )}

        <div className="channel-welcome premium-channel-welcome">
          <div className="welcome-icon">
            <Hash size={36} />
          </div>

          <h1>Welcome to #{channel.name}</h1>
          <p>This is the beginning of this channel.</p>
        </div>

        {filteredMessages.map((message) => {
          const isMine =
            message.sender?._id?.toString() === user?._id?.toString();

          return (
            <div className="message-row premium-message-row" key={message._id}>
              <button
                className="message-avatar profile-clickable"
                onClick={() => openProfile(message.sender)}
              >
                {getAvatar(message.sender)}
              </button>

              <div className="message-body">
                {message.replyTo && (
                  <div className="reply-preview-inline">
                    <Reply size={13} />
                    <strong>{message.replyTo.sender?.username || "User"}</strong>
                    <span>{getReplyPreviewText(message.replyTo)}</span>
                  </div>
                )}

                <div className="message-meta">
                  <button
                    className="message-username-btn"
                    onClick={() => openProfile(message.sender)}
                  >
                    {message.sender?.username || "User"}
                  </button>

                  <span>{new Date(message.createdAt).toLocaleString()}</span>

                  {message.isPinned && (
                    <span className="pinned-label">Pinned</span>
                  )}

                  {copiedMessageId === message._id && (
                    <span className="copied-label">Copied</span>
                  )}
                </div>

                {editingId === message._id ? (
                  <div className="edit-message-box">
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                    />

                    <button onClick={() => saveEdit(message._id)}>
                      <Check size={16} />
                    </button>

                    <button onClick={() => setEditingId(null)}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {message.content && <p>{message.content}</p>}
                    {renderFile(message)}

                    <div className="reaction-row">
                      {message.reactions?.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          className="reaction-pill"
                          onClick={() =>
                            reactToMessage(message._id, reaction.emoji)
                          }
                        >
                          <span>{reaction.emoji}</span>
                          <strong>{reaction.users.length}</strong>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="message-actions reaction-actions">
                <button
                  className="quick-reaction-btn"
                  onClick={() => startReply(message)}
                  title="Reply"
                >
                  <Reply size={15} />
                </button>

                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className="quick-reaction-btn"
                    onClick={() => reactToMessage(message._id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}

                {isMine && (
                  <>
                    <button onClick={() => setOpenMenu(message._id)}>
                      <MoreVertical size={17} />
                    </button>

                    {openMenu === message._id && (
                      <div className="message-menu">
                        <button onClick={() => startReply(message)}>
                          <Reply size={15} />
                          Reply
                        </button>

                        <button onClick={() => togglePinMessage(message._id)}>
                          <Pin size={15} />
                          {message.isPinned ? "Unpin" : "Pin"}
                        </button>

                        {message.content && (
                          <button onClick={() => copyMessage(message)}>
                            <Copy size={15} />
                            Copy
                          </button>
                        )}

                        <button onClick={() => startEdit(message)}>
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button onClick={() => deleteMessage(message._id)}>
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {typingUser && (
          <div className="typing-text">{typingUser} is typing...</div>
        )}

        <div ref={bottomRef} />
      </div>

      {showScrollDown && (
        <button
          className="scroll-down-btn"
          type="button"
          onClick={() => scrollToBottom(true)}
        >
          <ArrowDown size={16} />
          Scroll to latest
        </button>
      )}

      {file && (
        <div className="selected-file-preview">Selected: {file.name}</div>
      )}

      {replyingTo && (
        <div className="reply-compose-bar">
          <div>
            <span>
              <Reply size={16} />
              Replying to <strong>{replyingTo.sender?.username || "User"}</strong>
            </span>
            <small>{getReplyPreviewText(replyingTo)}</small>
          </div>

          <button type="button" onClick={() => setReplyingTo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {showProfileSettings && (
        <ProfileModal onClose={() => setShowProfileSettings(false)} />
      )}

      <button
        className="mobile-self-profile"
        type="button"
        onClick={() => setShowProfileSettings(true)}
      >
        <span className="mobile-self-avatar">{getAvatar(user)}</span>

        <span className="mobile-self-info">
          <strong>{user?.username || "Profile"}</strong>
          <small>{user?.status || "online"}</small>
        </span>

        <Settings size={17} />
      </button>

      <form className="message-input-box premium-message-input" onSubmit={sendMessage}>
        <label className="file-upload-btn">
          <Paperclip size={20} />
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
        </label>

        <input
          placeholder={
            replyingTo
              ? `Reply to ${replyingTo.sender?.username || "User"}`
              : `Message #${channel.name}`
          }
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
        />

        <button type="submit">
          <Send size={20} />
        </button>
      </form>
    </main>
  );
}

