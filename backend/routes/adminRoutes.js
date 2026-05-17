const express = require("express");
const User = require("../models/User");
const Server = require("../models/Server");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/stats", protect, adminOnly, async (req, res) => {
  const usersCount = await User.countDocuments();
  const serversCount = await Server.countDocuments();
  const messagesCount = await Message.countDocuments();

  const onlineUsers = await User.countDocuments({
    status: "online"
  });

  res.json({
    usersCount,
    serversCount,
    messagesCount,
    onlineUsers
  });
});

router.get("/users", protect, adminOnly, async (req, res) => {
  const users = await User.find()
    .select("-password")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(users);
});

router.get("/servers", protect, adminOnly, async (req, res) => {
  const servers = await Server.find()
    .populate("owner", "username email avatar avatarUrl")
    .populate("members.user", "username email avatar avatarUrl status")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(servers);
});

router.put("/users/:userId/admin", protect, adminOnly, async (req, res) => {
  const { isAdmin } = req.body;

  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({
      message: "You cannot change your own admin status"
    });
  }

  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  user.isAdmin = Boolean(isAdmin);
  await user.save();

  res.json({
    message: isAdmin ? "User promoted to admin" : "Admin removed"
  });
});

router.delete("/users/:userId", protect, adminOnly, async (req, res) => {
  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json({
      message: "You cannot delete yourself"
    });
  }

  await User.findByIdAndDelete(req.params.userId);

  res.json({
    message: "User deleted"
  });
});

router.delete("/servers/:serverId", protect, adminOnly, async (req, res) => {
  const server = await Server.findById(req.params.serverId);

  if (!server) {
    return res.status(404).json({
      message: "Server not found"
    });
  }

  await Message.deleteMany({
    server: server._id
  });

  await server.deleteOne();

  res.json({
    message: "Server and messages deleted"
  });
});

module.exports = router;