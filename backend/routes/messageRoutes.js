const express = require("express");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:channelId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      channel: req.params.channelId
    })
      .populate("sender", "username avatar status")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:channelId", protect, async (req, res) => {
  try {
    const { content } = req.body;

    const channel = await Channel.findById(req.params.channelId);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const message = await Message.create({
      content,
      channel: channel._id,
      server: channel.server,
      sender: req.user._id
    });

    const populated = await Message.findById(message._id).populate(
      "sender",
      "username avatar status"
    );

    const io = req.app.get("io");
    io.to(req.params.channelId).emit("new-message", populated);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;