const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/servers", require("./routes/serverRoutes"));
app.use("/api/channels", require("./routes/channelRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

app.get("/", (req, res) => {
  res.send("Discord Clone API running");
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-channel", (channelId) => {
    socket.join(channelId);
  });

  socket.on("leave-channel", (channelId) => {
    socket.leave(channelId);
  });

  socket.on("typing", ({ channelId, username }) => {
    socket.to(channelId).emit("typing", username);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});