const express = require("express");
const Channel = require("../models/Channel");
const Server = require("../models/Server");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const getMember = (server, userId) => {
  return server.members.find(
    (m) => m.user.toString() === userId.toString()
  );
};

const hasPermission = (server, userId, permission) => {
  if (typeof server.memberHasPermission === "function") {
    return server.memberHasPermission(userId, permission);
  }

  const member = getMember(server, userId);
  if (!member) return false;
  if (member.role === "owner") return true;

  const role = server.roles?.find((r) => r.name === member.role);
  return Boolean(role?.permissions?.[permission]);
};

router.get("/:serverId", protect, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    const member = getMember(server, req.user._id);

    if (!member) {
      return res.status(403).json({ message: "You are not in this server" });
    }

    const channels = await Channel.find({
      server: req.params.serverId
    }).sort({ createdAt: 1 });

    res.json(channels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:serverId", protect, async (req, res) => {
  try {
    const { name, type } = req.body;

    const server = await Server.findById(req.params.serverId);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (!hasPermission(server, req.user._id, "createChannels")) {
      return res.status(403).json({ message: "No permission to create channels" });
    }

    const channel = await Channel.create({
      name,
      type: type || "text",
      server: server._id
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:channelId", protect, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const server = await Server.findById(channel.server);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (!hasPermission(server, req.user._id, "deleteChannels")) {
      return res.status(403).json({ message: "No permission to delete channels" });
    }

    await channel.deleteOne();

    res.json({ message: "Channel deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;