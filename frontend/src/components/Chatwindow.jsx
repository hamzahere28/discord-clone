import {
    Hash,
    Send,
    Pin,
    Bell,
    Users,
    Search,
    Inbox,
    HelpCircle
  } from "lucide-react";
  
  import { useEffect, useRef, useState } from "react";
  import API from "../api";
  import socket from "../socket";
  import { useAuth } from "../context/authContext";
  
  export default function ChatWindow({ server, channel }) {
    const { user } = useAuth();
  
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");
    const [typingUser, setTypingUser] = useState("");
  
    const bottomRef = useRef(null);
  
    const fetchMessages = async () => {
      if (!channel) return;
  
      const { data } = await API.get(`/messages/${channel._id}`);
      setMessages(data);
    };
  
    const sendMessage = async (e) => {
      e.preventDefault();
  
      if (!content.trim()) return;
  
      await API.post(`/messages/${channel._id}`, {
        content
      });
  
      setContent("");
    };
  
    const handleTyping = () => {
      if (!channel || !user) return;
  
      socket.emit("typing", {
        channelId: channel._id,
        username: user.username
      });
    };
  
    useEffect(() => {
      if (!channel) return;
  
      fetchMessages();
  
      socket.emit("join-channel", channel._id);
  
      socket.on("new-message", (message) => {
        const messageChannelId =
          typeof message.channel === "object"
            ? message.channel._id
            : message.channel;
  
        if (messageChannelId === channel._id) {
          setMessages((prev) => [...prev, message]);
        }
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
        socket.off("typing");
      };
    }, [channel]);
  
    useEffect(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }, [messages]);
  
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
          <h2>No channel selected</h2>
          <p>Create or select a text channel.</p>
        </main>
      );
    }
  
    return (
      <main className="chat-window">
        <div className="chat-header upgraded-chat-header">
          <div className="chat-title-block">
            <Hash size={24} />
  
            <div>
              <h2>{channel.name}</h2>
              <p>Server: {server.name}</p>
            </div>
          </div>
  
          <div className="chat-toolbar">
            <button title="Notifications" type="button">
              <Bell size={19} />
            </button>
  
            <button title="Pinned messages" type="button">
              <Pin size={19} />
            </button>
  
            <button title="Member list" type="button">
              <Users size={19} />
            </button>
  
            <div className="chat-search-box">
              <Search size={15} />
              <input placeholder="Search" />
            </div>
  
            <button title="Inbox" type="button">
              <Inbox size={19} />
            </button>
  
            <button title="Help" type="button">
              <HelpCircle size={19} />
            </button>
          </div>
        </div>
  
        <div className="messages-area">
          <div className="channel-welcome">
            <div className="welcome-icon">
              <Hash size={36} />
            </div>
  
            <h1>Welcome to #{channel.name}</h1>
            <p>This is the beginning of the channel.</p>
          </div>
  
          {messages.map((message) => (
            <div className="message-row" key={message._id}>
              <div className="message-avatar">
                {message.sender?.avatar ||
                  message.sender?.username?.charAt(0)}
              </div>
  
              <div className="message-body">
                <div className="message-meta">
                  <strong>{message.sender?.username}</strong>
  
                  <span>
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
  
                <p>{message.content}</p>
              </div>
            </div>
          ))}
  
          {typingUser && (
            <div className="typing-text">
              {typingUser} is typing...
            </div>
          )}
  
          <div ref={bottomRef} />
        </div>
  
        <form className="message-input-box" onSubmit={sendMessage}>
          <input
            placeholder={`Message #${channel.name}`}
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