const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const User = require("./models/User");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const configuredClientUrls = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS
]
  .filter(Boolean)
  .flatMap((urls) => urls.split(","))
  .map((url) => url.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://hamza-discord-clone.vercel.app",
  "https://frontend-five-smoky-ouc795ethj.vercel.app",
  ...configuredClientUrls
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);

    return (
      protocol === "https:" &&
      hostname.endsWith(".vercel.app") &&
      (hostname.startsWith("hamza-discord-clone") ||
        hostname.startsWith("frontend-"))
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set("io", io);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/servers", require("./routes/serverRoutes"));
app.use("/api/channels", require("./routes/channelRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/friends", require("./routes/friendRoutes"));
app.use("/api/dms", require("./routes/directMessageRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => {
  res.send("Discord Clone API running");
});

const voiceRooms = {};

const getVoiceUsers = (channelId) => {
  return Object.values(voiceRooms[channelId] || {});
};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user-online", async (userId) => {
    socket.join(userId);

    await User.findByIdAndUpdate(userId, {
      status: "online"
    });

    io.emit("status-updated", {
      userId,
      status: "online"
    });
  });

  socket.on("join-channel", (channelId) => {
    socket.join(channelId);
  });

  socket.on("leave-channel", (channelId) => {
    socket.leave(channelId);
  });

  socket.on("join-voice", ({ channelId, user }) => {
    if (!channelId || !user) return;

    socket.join(`voice-${channelId}`);

    if (!voiceRooms[channelId]) {
      voiceRooms[channelId] = {};
    }

    voiceRooms[channelId][socket.id] = {
      socketId: socket.id,
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      avatarUrl: user.avatarUrl,
      muted: false,
      deafened: false
    };

    socket.to(`voice-${channelId}`).emit("voice-user-ready", {
      channelId,
      socketId: socket.id,
      user: voiceRooms[channelId][socket.id]
    });

    io.to(`voice-${channelId}`).emit("voice-users-updated", {
      channelId,
      users: getVoiceUsers(channelId)
    });
  });

  socket.on("leave-voice", ({ channelId }) => {
    if (!channelId) return;

    socket.leave(`voice-${channelId}`);

    if (voiceRooms[channelId]) {
      delete voiceRooms[channelId][socket.id];
    }

    socket.to(`voice-${channelId}`).emit("voice-user-left", {
      channelId,
      socketId: socket.id
    });

    io.to(`voice-${channelId}`).emit("voice-users-updated", {
      channelId,
      users: getVoiceUsers(channelId)
    });
  });

  socket.on("voice-state-change", ({ channelId, muted, deafened }) => {
    if (!channelId || !voiceRooms[channelId]?.[socket.id]) return;

    voiceRooms[channelId][socket.id].muted = Boolean(muted);
    voiceRooms[channelId][socket.id].deafened = Boolean(deafened);

    io.to(`voice-${channelId}`).emit("voice-users-updated", {
      channelId,
      users: getVoiceUsers(channelId)
    });
  });

  socket.on("webrtc-offer", ({ to, offer }) => {
    io.to(to).emit("webrtc-offer", {
      from: socket.id,
      offer
    });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    io.to(to).emit("webrtc-answer", {
      from: socket.id,
      answer
    });
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("webrtc-ice-candidate", {
      from: socket.id,
      candidate
    });
  });

  socket.on("typing", ({ channelId, username }) => {
    socket.to(channelId).emit("typing", username);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    Object.keys(voiceRooms).forEach((channelId) => {
      if (voiceRooms[channelId]?.[socket.id]) {
        delete voiceRooms[channelId][socket.id];

        socket.to(`voice-${channelId}`).emit("voice-user-left", {
          channelId,
          socketId: socket.id
        });

        io.to(`voice-${channelId}`).emit("voice-users-updated", {
          channelId,
          users: getVoiceUsers(channelId)
        });
      }
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
