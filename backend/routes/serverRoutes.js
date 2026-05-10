const express = require("express");
const crypto = require("crypto");
const Server = require("../models/Server");
const Channel = require("../models/Channel");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const createInviteCode = () => crypto.randomBytes(4).toString("hex");

router.get("/", protect, async (req, res) => {
  try {
    const servers = await Server.find({
      "members.user": req.user._id
    })
      .populate("owner", "username avatar")
      .populate("members.user", "username avatar status");

    res.json(servers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { name, icon } = req.body;

    const server = await Server.create({
      name,
      icon: icon || name.charAt(0).toUpperCase(),
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

    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id)
      .populate("owner", "username avatar")
      .populate("members.user", "username avatar status");

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    res.json(server);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/join/:inviteCode", protect, async (req, res) => {
  try {
    const server = await Server.findOne({
      inviteCode: req.params.inviteCode
    });

    if (!server) {
      return res.status(404).json({ message: "Invalid invite code" });
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

    res.json(server);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);

    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    if (server.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only owner can delete server" });
    }

    await Channel.deleteMany({ server: server._id });
    await server.deleteOne();

    res.json({ message: "Server deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;