const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("friends", "username email avatar avatarUrl status bio")
    .populate("friendRequests.from", "username email avatar avatarUrl status bio");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    friends: user.friends || [],
    requests: user.friendRequests.filter((r) => r.status === "pending")
  });
});

router.post("/request", protect, async (req, res) => {
  const { email, userId } = req.body;

  if (!email && !userId) {
    return res.status(400).json({
      message: "Email or userId is required"
    });
  }

  let target = null;

  if (userId) {
    target = await User.findById(userId);
  }

  if (!target && email) {
    target = await User.findOne({
      email: email.trim().toLowerCase()
    });
  }

  if (!target) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  if (target._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      message: "You cannot add yourself"
    });
  }

  const currentUser = await User.findById(req.user._id);

  if (!currentUser) {
    return res.status(404).json({
      message: "Current user not found"
    });
  }

  const alreadyFriend =
    currentUser.friends.some(
      (friendId) => friendId.toString() === target._id.toString()
    ) ||
    target.friends.some(
      (friendId) => friendId.toString() === currentUser._id.toString()
    );

  if (alreadyFriend) {
    return res.status(400).json({
      message: "Already friends"
    });
  }

  const alreadyRequested = target.friendRequests.some(
    (request) =>
      request.from.toString() === currentUser._id.toString() &&
      request.status === "pending"
  );

  if (alreadyRequested) {
    return res.status(400).json({
      message: "Request already sent"
    });
  }

  target.friendRequests.push({
    from: currentUser._id,
    status: "pending"
  });

  await target.save();

  const io = req.app.get("io");

  if (io) {
    io.to(target._id.toString()).emit("friend-request-received", {
      from: {
        _id: currentUser._id,
        username: currentUser.username,
        email: currentUser.email,
        avatar: currentUser.avatar,
        avatarUrl: currentUser.avatarUrl,
        status: currentUser.status
      }
    });
  }

  res.json({
    message: "Friend request sent"
  });
});

router.put("/accept/:requestId", protect, async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const request = user.friendRequests.id(req.params.requestId);

  if (!request) {
    return res.status(404).json({
      message: "Request not found"
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      message: "Request already handled"
    });
  }

  request.status = "accepted";

  if (
    !user.friends.some(
      (friendId) => friendId.toString() === request.from.toString()
    )
  ) {
    user.friends.push(request.from);
  }

  const sender = await User.findById(request.from);

  if (!sender) {
    return res.status(404).json({
      message: "Request sender not found"
    });
  }

  if (
    !sender.friends.some(
      (friendId) => friendId.toString() === user._id.toString()
    )
  ) {
    sender.friends.push(user._id);
  }

  await user.save();
  await sender.save();

  const io = req.app.get("io");

  if (io) {
    io.to(sender._id.toString()).emit("friend-request-accepted", {
      by: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl,
        status: user.status
      }
    });
  }

  res.json({
    message: "Friend request accepted"
  });
});

router.put("/reject/:requestId", protect, async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const request = user.friendRequests.id(req.params.requestId);

  if (!request) {
    return res.status(404).json({
      message: "Request not found"
    });
  }

  request.status = "rejected";

  await user.save();

  res.json({
    message: "Friend request rejected"
  });
});

module.exports = router;