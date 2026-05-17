const express = require("express");
const DirectMessage = require("../models/DirectMessage");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:friendId", protect, async (req, res) => {
  const messages = await DirectMessage.find({
    $or: [
      { sender: req.user._id, receiver: req.params.friendId },
      { sender: req.params.friendId, receiver: req.user._id }
    ]
  })
    .populate("sender", "username avatar avatarUrl status")
    .populate("receiver", "username avatar avatarUrl status")
    .sort({ createdAt: 1 });

  res.json(messages);
});

router.post("/:friendId", protect, upload.single("file"), async (req, res) => {
  const { content } = req.body;

  const message = await DirectMessage.create({
    sender: req.user._id,
    receiver: req.params.friendId,
    content: content || "",
    fileUrl: req.file ? `/uploads/${req.file.filename}` : "",
    fileType: req.file ? req.file.mimetype : ""
  });

  const populated = await DirectMessage.findById(message._id)
    .populate("sender", "username avatar avatarUrl status")
    .populate("receiver", "username avatar avatarUrl status");

  req.app
    .get("io")
    .to(req.params.friendId)
    .to(req.user._id.toString())
    .emit("new-dm", populated);

  res.status(201).json(populated);
});

module.exports = router;