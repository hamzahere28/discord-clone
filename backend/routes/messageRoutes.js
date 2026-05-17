const express = require("express");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const Server = require("../models/Server");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const populateMessage = async (messageId) => {
  return Message.findById(messageId)
    .populate("sender", "username avatar avatarUrl status")
    .populate({
      path: "replyTo",
      select: "content fileUrl fileType sender createdAt",
      populate: {
        path: "sender",
        select: "username avatar avatarUrl status"
      }
    });
};

const getMember = (server, userId) => {
  return server.members.find((m) => m.user.toString() === userId.toString());
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

router.get("/pinned/all", protect, async (req, res) => {
  const messages = await Message.find({ isPinned: true })
    .populate("sender", "username avatar avatarUrl status")
    .populate("channel", "name")
    .populate("server", "name")
    .populate({
      path: "replyTo",
      select: "content fileUrl fileType sender createdAt",
      populate: {
        path: "sender",
        select: "username avatar avatarUrl status"
      }
    })
    .sort({ updatedAt: -1 })
    .limit(100);

  res.json(messages);
});

router.get("/:channelId", protect, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before;

  const channel = await Channel.findById(req.params.channelId);

  if (!channel) {
    return res.status(404).json({ message: "Channel not found" });
  }

  const server = await Server.findById(channel.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const member = getMember(server, req.user._id);

  if (!member) {
    return res.status(403).json({ message: "You are not in this server" });
  }

  const query = {
    channel: req.params.channelId
  };

  if (before) {
    query.createdAt = {
      $lt: new Date(before)
    };
  }

  const messages = await Message.find(query)
    .populate("sender", "username avatar avatarUrl status")
    .populate({
      path: "replyTo",
      select: "content fileUrl fileType sender createdAt",
      populate: {
        path: "sender",
        select: "username avatar avatarUrl status"
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json(messages.reverse());
});

router.post("/:channelId", protect, upload.single("file"), async (req, res) => {
  const { content, replyTo, type, pollQuestion, pollOptions } = req.body;

  const channel = await Channel.findById(req.params.channelId);

  if (!channel) {
    return res.status(404).json({ message: "Channel not found" });
  }

  const server = await Server.findById(channel.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const member = getMember(server, req.user._id);

  if (!member) {
    return res.status(403).json({ message: "You are not in this server" });
  }

  const isBanned = server.bannedUsers?.some(
    (ban) => ban.user.toString() === req.user._id.toString()
  );

  if (isBanned) {
    return res.status(403).json({ message: "You are banned from this server" });
  }

  let replyMessage = null;

  if (replyTo) {
    replyMessage = await Message.findById(replyTo);

    if (!replyMessage) {
      return res.status(404).json({ message: "Reply message not found" });
    }

    if (replyMessage.channel.toString() !== channel._id.toString()) {
      return res.status(400).json({
        message: "You can only reply to messages in the same channel"
      });
    }
  }

  let parsedPollOptions = [];

  if (type === "poll") {
    try {
      parsedPollOptions = JSON.parse(pollOptions || "[]");
    } catch {
      parsedPollOptions = [];
    }

    parsedPollOptions = parsedPollOptions
      .map((option) => String(option).trim())
      .filter(Boolean)
      .slice(0, 6);

    if (!pollQuestion || parsedPollOptions.length < 2) {
      return res.status(400).json({
        message: "Poll needs a question and at least 2 options"
      });
    }
  }

  const message = await Message.create({
    content: content || "",
    type: type === "poll" ? "poll" : "text",
    poll:
      type === "poll"
        ? {
            question: pollQuestion.trim(),
            options: parsedPollOptions.map((option) => ({
              text: option,
              votes: []
            }))
          }
        : {
            question: "",
            options: []
          },
    channel: channel._id,
    server: channel.server,
    sender: req.user._id,
    replyTo: replyMessage ? replyMessage._id : null,
    fileUrl: req.file ? `/uploads/${req.file.filename}` : "",
    fileType: req.file ? req.file.mimetype : ""
  });

  const populated = await populateMessage(message._id);

  req.app.get("io").to(req.params.channelId).emit("new-message", populated);

  res.status(201).json(populated);
});

router.put("/:messageId", protect, async (req, res) => {
  const { content } = req.body;

  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  const server = await Server.findById(message.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const isBanned = server.bannedUsers?.some(
    (ban) => ban.user.toString() === req.user._id.toString()
  );

  if (isBanned) {
    return res.status(403).json({ message: "You are banned from this server" });
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      message: "You can only edit your own message"
    });
  }

  message.content = content;
  await message.save();

  const updated = await populateMessage(message._id);

  req.app.get("io").to(message.channel.toString()).emit("message-updated", updated);

  res.json(updated);
});

router.put("/:messageId/reactions", protect, async (req, res) => {
  const { emoji } = req.body;

  if (!emoji) {
    return res.status(400).json({ message: "Emoji is required" });
  }

  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  const server = await Server.findById(message.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const member = getMember(server, req.user._id);

  if (!member) {
    return res.status(403).json({ message: "You are not in this server" });
  }

  const isBanned = server.bannedUsers?.some(
    (ban) => ban.user.toString() === req.user._id.toString()
  );

  if (isBanned) {
    return res.status(403).json({ message: "You are banned from this server" });
  }

  const userId = req.user._id.toString();
  let reaction = message.reactions.find((r) => r.emoji === emoji);

  if (!reaction) {
    message.reactions.push({
      emoji,
      users: [req.user._id]
    });
  } else {
    const alreadyReacted = reaction.users.some(
      (id) => id.toString() === userId
    );

    if (alreadyReacted) {
      reaction.users = reaction.users.filter(
        (id) => id.toString() !== userId
      );
    } else {
      reaction.users.push(req.user._id);
    }
  }

  message.reactions = message.reactions.filter(
    (reaction) => reaction.users.length > 0
  );

  await message.save();

  const updated = await populateMessage(message._id);

  req.app.get("io").to(message.channel.toString()).emit("message-updated", updated);

  res.json(updated);
});

router.put("/:messageId/pin", protect, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  const server = await Server.findById(message.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const isOwner = message.sender.toString() === req.user._id.toString();
  const canPin = hasPermission(server, req.user._id, "pinMessages");

  if (!isOwner && !canPin) {
    return res.status(403).json({ message: "No permission to pin" });
  }

  message.isPinned = !message.isPinned;
  await message.save();

  const updated = await populateMessage(message._id);

  req.app.get("io").to(message.channel.toString()).emit("message-updated", updated);

  res.json(updated);
});

router.put("/:messageId/poll/:optionId", protect, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  const server = await Server.findById(message.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const member = getMember(server, req.user._id);

  if (!member) {
    return res.status(403).json({ message: "You are not in this server" });
  }

  const isBanned = server.bannedUsers?.some(
    (ban) => ban.user.toString() === req.user._id.toString()
  );

  if (isBanned) {
    return res.status(403).json({ message: "You are banned from this server" });
  }

  if (message.type !== "poll") {
    return res.status(400).json({ message: "This message is not a poll" });
  }

  const option = message.poll.options.id(req.params.optionId);

  if (!option) {
    return res.status(404).json({ message: "Poll option not found" });
  }

  const userId = req.user._id.toString();

  message.poll.options.forEach((pollOption) => {
    pollOption.votes = pollOption.votes.filter(
      (id) => id.toString() !== userId
    );
  });

  option.votes.push(req.user._id);

  await message.save();

  const updated = await populateMessage(message._id);

  req.app.get("io").to(message.channel.toString()).emit("message-updated", updated);

  res.json(updated);
});

router.delete("/:messageId", protect, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  const server = await Server.findById(message.server);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const isOwner = message.sender.toString() === req.user._id.toString();
  const canDelete = hasPermission(server, req.user._id, "deleteMessages");

  if (!isOwner && !canDelete) {
    return res.status(403).json({ message: "No permission to delete" });
  }

  const channelId = message.channel.toString();

  await message.deleteOne();

  req.app.get("io").to(channelId).emit("message-deleted", req.params.messageId);

  res.json({ message: "Message deleted" });
});

module.exports = router;