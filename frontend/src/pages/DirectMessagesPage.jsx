import {
  ArrowLeft,
  Send,
  Paperclip,
  MessageCircle
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import API from "../api";
import socket from "../socket";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function DirectMessagesPage() {
  const { friendId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);

  const bottomRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const { data } = await API.get(`/dms/${friendId}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("DM fetch error:", error.response?.data || error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!content.trim() && !file) return;

    const formData = new FormData();
    formData.append("content", content);

    if (file) {
      formData.append("file", file);
    }

    await API.post(`/dms/${friendId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    setContent("");
    setFile(null);
  };

  const renderFile = (message) => {
    if (!message.fileUrl) return null;

    const url = `${BACKEND_URL}${message.fileUrl}`;

    if (message.fileType?.startsWith("image/")) {
      return <img src={url} alt="file" className="chat-file-img" />;
    }

    return (
      <a className="chat-file-link" href={url} target="_blank">
        Open attachment
      </a>
    );
  };

  useEffect(() => {
    fetchMessages();

    socket.connect();

    socket.on("new-dm", (message) => {
      const senderId =
        typeof message.sender === "object" ? message.sender._id : message.sender;

      const receiverId =
        typeof message.receiver === "object"
          ? message.receiver._id
          : message.receiver;

      const belongsHere =
        senderId === friendId ||
        receiverId === friendId ||
        senderId === user?._id ||
        receiverId === user?._id;

      if (belongsHere) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("new-dm");
    };
  }, [friendId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  return (
    <div className="dm-page">
      <div className="dm-header">
        <button onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div>
          <h2>Direct Messages</h2>
          <p>Private chat</p>
        </div>
      </div>

      <div className="dm-messages">
        {messages.length === 0 && (
          <div className="dm-empty">
            <MessageCircle size={48} />
            <h2>No messages yet</h2>
            <p>Start a private conversation.</p>
          </div>
        )}

        {messages.map((message) => {
          const mine =
            message.sender?._id?.toString() === user?._id?.toString();

          return (
            <div
              className={mine ? "dm-row mine" : "dm-row"}
              key={message._id}
            >
              <div className="dm-bubble">
                <strong>{message.sender?.username || "User"}</strong>

                {message.content && <p>{message.content}</p>}

                {renderFile(message)}

                <span>
                  {new Date(message.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <form className="dm-input-box" onSubmit={sendMessage}>
        <label>
          <Paperclip size={20} />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            hidden
          />
        </label>

        <input
          placeholder="Send a private message"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button>
          <Send size={20} />
        </button>
      </form>

      {file && (
        <div className="selected-file-preview">
          Selected: {file.name}
        </div>
      )}
    </div>
  );
}