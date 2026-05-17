const express = require("express");
const crypto = require("crypto");
const Server = require("../models/Server");
const Channel = require("../models/Channel");
const Message = require("../models/Message");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const createInviteCode = () => crypto.randomBytes(4).toString("hex");

const getMember = (server, userId) => {
  return server.members.find((m) => {
    const memberUserId =
      typeof m.user === "object" && m.user !== null
        ? m.user._id.toString()
        : m.user.toString();

    return memberUserId === userId.toString();
  });
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

const populateServer = async (serverId) => {
  return Server.findById(serverId)
    .populate("owner", "username avatar avatarUrl status email")
    .populate("members.user", "username avatar avatarUrl status email")
    .populate("bannedUsers.user", "username avatar avatarUrl status email")
    .populate("bannedUsers.bannedBy", "username avatar avatarUrl status email");
};

router.get("/", protect, async (req, res) => {
  const servers = await Server.find({
    "members.user": req.user._id
  })
    .populate("owner", "username avatar avatarUrl status email")
    .populate("members.user", "username avatar avatarUrl status email")
    .populate("bannedUsers.user", "username avatar avatarUrl status email")
    .populate("bannedUsers.bannedBy", "username avatar avatarUrl status email");

  res.json(servers);
});

router.post("/", protect, async (req, res) => {
  const { name, icon } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: "Server name is required" });
  }

  const server = await Server.create({
    name: name.trim(),
    icon: icon || name.trim().charAt(0).toUpperCase(),
    owner: req.user._id,
    inviteCode: createInviteCode(),
    members: [
      {
        user: req.user._id,
        role: "owner"
      }
    ]
  });

  await Channel.create({
    name: "general",
    server: server._id,
    type: "text"
  });

  const populated = await populateServer(server._id);
  res.status(201).json(populated);
});

router.get("/:id/dashboard", protect, async (req, res) => {
  const server = await Server.findById(req.params.id)
    .populate("owner", "username avatar avatarUrl status email")
    .populate("members.user", "username avatar avatarUrl status email");

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  const member = getMember(server, req.user._id);

  if (!member) {
    return res.status(403).json({ message: "You are not in this server" });
  }

  const channels = await Channel.find({ server: server._id }).sort({
    createdAt: 1
  });

  const messages = await Message.find({ server: server._id })
    .populate("sender", "username avatar avatarUrl status")
    .populate("channel", "name type")
    .sort({ createdAt: -1 })
    .limit(10);

  const messagesCount = await Message.countDocuments({
    server: server._id
  });

  const staffCount = server.members.filter((m) =>
    ["owner", "admin", "moderator"].includes(m.role)
  ).length;

  const textChannels = channels.filter((c) => c.type === "text").length;
  const voiceChannels = channels.filter((c) => c.type === "voice").length;

  res.json({
    server: {
      _id: server._id,
      name: server.name,
      icon: server.icon,
      owner: server.owner,
      inviteCode: server.inviteCode
    },
    counts: {
      members: server.members.length,
      channels: channels.length,
      textChannels,
      voiceChannels,
      messages: messagesCount,
      staff: staffCount
    },
    members: server.members,
    channels,
    recentMessages: messages
  });
});

router.get("/:id", protect, async (req, res) => {
  const server = await populateServer(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  res.json(server);
});

router.put("/:id", protect, async (req, res) => {
  const { name, icon } = req.body;

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "manageServer")) {
    return res.status(403).json({ message: "No permission to manage server" });
  }

  if (name) server.name = name;
  if (icon) server.icon = icon;

  await server.save();

  const populated = await populateServer(server._id);
  res.json(populated);
});

router.put("/:id/regenerate-invite", protect, async (req, res) => {
  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "manageServer")) {
    return res.status(403).json({ message: "No permission to manage server" });
  }

  server.inviteCode = createInviteCode();
  await server.save();

  const populated = await populateServer(server._id);
  res.json(populated);
});

router.put("/:id/role", protect, async (req, res) => {
  const { userId, role } = req.body;

  if (!["admin", "moderator", "member"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "manageRoles")) {
    return res.status(403).json({ message: "No permission to manage roles" });
  }

  const member = getMember(server, userId);

  if (!member) {
    return res.status(404).json({ message: "Member not found" });
  }

  if (member.role === "owner") {
    return res.status(400).json({ message: "Owner role cannot be changed" });
  }

  member.role = role;
  await server.save();

  const populated = await populateServer(server._id);
  res.json(populated);
});

router.put("/:id/permissions/:roleName", protect, async (req, res) => {
  const { roleName } = req.params;
  const permissions = req.body.permissions || {};

  if (!["admin", "moderator", "member"].includes(roleName)) {
    return res.status(400).json({
      message: "You cannot edit this role permissions"
    });
  }

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "manageRoles")) {
    return res.status(403).json({ message: "No permission to manage roles" });
  }

  const role = server.roles.find((r) => r.name === roleName);

  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }

  const allowedPermissions = [
    "manageServer",
    "manageRoles",
    "createChannels",
    "deleteChannels",
    "pinMessages",
    "deleteMessages",
    "kickMembers",
    "banMembers",
    "clearMessages"
  ];

  allowedPermissions.forEach((permission) => {
    if (typeof permissions[permission] === "boolean") {
      role.permissions[permission] = permissions[permission];
    }
  });

  await server.save();

  const populated = await populateServer(server._id);
  res.json(populated);
});

router.put("/:id/kick", protect, async (req, res) => {
  const { userId } = req.body;

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "kickMembers")) {
    return res.status(403).json({ message: "No permission to kick members" });
  }

  if (server.owner.toString() === userId.toString()) {
    return res.status(400).json({ message: "Owner cannot be kicked" });
  }

  const targetMember = getMember(server, userId);

  if (!targetMember) {
    return res.status(404).json({ message: "Member not found" });
  }

  server.members = server.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );

  await server.save();

  const populated = await populateServer(server._id);
  res.json({
    message: "Member kicked",
    server: populated
  });
});

router.put("/:id/ban", protect, async (req, res) => {
  const { userId, reason } = req.body;

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "banMembers")) {
    return res.status(403).json({ message: "No permission to ban members" });
  }

  if (server.owner.toString() === userId.toString()) {
    return res.status(400).json({ message: "Owner cannot be banned" });
  }

  const alreadyBanned = server.bannedUsers.some(
    (ban) => ban.user.toString() === userId.toString()
  );

  if (!alreadyBanned) {
    server.bannedUsers.push({
      user: userId,
      bannedBy: req.user._id,
      reason: reason || ""
    });
  }

  server.members = server.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );

  await server.save();

  const populated = await populateServer(server._id);
  res.json({
    message: "Member banned",
    server: populated
  });
});

router.put("/:id/unban", protect, async (req, res) => {
  const { userId } = req.body;

  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "banMembers")) {
    return res.status(403).json({ message: "No permission to unban members" });
  }

  server.bannedUsers = server.bannedUsers.filter(
    (ban) => ban.user.toString() !== userId.toString()
  );

  await server.save();

  const populated = await populateServer(server._id);
  res.json({
    message: "User unbanned",
    server: populated
  });
});

router.delete("/:id/messages", protect, async (req, res) => {
  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (!hasPermission(server, req.user._id, "clearMessages")) {
    return res.status(403).json({ message: "No permission to clear messages" });
  }

  await Message.deleteMany({
    server: server._id
  });

  req.app.get("io").emit("server-messages-cleared", {
    serverId: server._id.toString()
  });

  res.json({ message: "Server messages cleared" });
});

router.post("/join/:inviteCode", protect, async (req, res) => {
  const server = await Server.findOne({
    inviteCode: req.params.inviteCode
  });

  if (!server) {
    return res.status(404).json({ message: "Invalid invite code" });
  }

  const isBanned = server.bannedUsers.some(
    (ban) => ban.user.toString() === req.user._id.toString()
  );

  if (isBanned) {
    return res.status(403).json({
      message: "You are banned from this server"
    });
  }

  const alreadyMember = server.members.some(
    (m) => m.user.toString() === req.user._id.toString()
  );

  if (!alreadyMember) {
    server.members.push({
      user: req.user._id,
      role: "member"
    });

    await server.save();
  }

  const populated = await populateServer(server._id);
  res.json(populated);
});

router.delete("/:id", protect, async (req, res) => {
  const server = await Server.findById(req.params.id);

  if (!server) {
    return res.status(404).json({ message: "Server not found" });
  }

  if (server.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only owner can delete server" });
  }

  await Message.deleteMany({ server: server._id });
  await Channel.deleteMany({ server: server._id });
  await server.deleteOne();

  res.json({ message: "Server deleted" });
});

module.exports = router;