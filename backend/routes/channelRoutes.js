const express = require("express");
const Channel = require("../models/Channel");
const Server = require("../models/Server");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:serverId", protect, async (req, res) => {
  try {
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

    const member = server.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member || !["owner", "admin"].includes(member.role)) {
      return res.status(403).json({ message: "No permission" });
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

    await channel.deleteOne();

    res.json({ message: "Channel deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;