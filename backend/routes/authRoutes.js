const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d"
  });
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },

  filename(req, file, cb) {
    const safeExt = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${safeExt}`;

    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
  fileSize: 15 * 1024 * 1024
  }
});

const fileToDataUrl = (file) => {
  if (!file?.path) return "";

  const buffer = fs.readFileSync(file.path);
  const mimeType = file.mimetype || "image/png";

  fs.unlink(file.path, () => {});

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

const userResponse = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  status: user.status,
  isAdmin: user.isAdmin || false,
  token: generateToken(user._id)
});

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Please fill all fields"
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: username.trim().charAt(0).toUpperCase(),
      avatarUrl: "",
      bio: "",
      status: "online"
    });

    res.status(201).json(userResponse(user));
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Register failed"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password"
      });
    }

    user.status = "online";
    await user.save();

    res.json(userResponse(user));
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed"
    });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(userResponse(user));
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({
      message: "Failed to fetch user"
    });
  }
});

router.put("/profile", protect, (req, res) => {
  upload.single("avatarImage")(req, res, async (uploadError) => {
    try {
      if (uploadError) {
        return res.status(400).json({
          message: uploadError.message || "Image upload failed"
        });
      }

      const { username, avatar, bio, status } = req.body || {};

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      if (username && username.trim()) {
        user.username = username.trim();
      }

      if (avatar !== undefined) {
        user.avatar = avatar.trim().slice(0, 2).toUpperCase();
      }

      if (bio !== undefined) {
        user.bio = bio.trim();
      }

      if (status && ["online", "idle", "dnd", "offline"].includes(status)) {
        user.status = status;
      }

      if (req.file) {
        user.avatarUrl = fileToDataUrl(req.file);
      }

      await user.save();

      req.app.get("io")?.emit("status-updated", {
        userId: user._id,
        status: user.status
      });

      res.json(userResponse(user));
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        message: error.message || "Profile update failed"
      });
    }
  });
});

router.put("/profile/avatar", protect, (req, res) => {
  upload.single("avatar")(req, res, async (uploadError) => {
    try {
      if (uploadError) {
        return res.status(400).json({
          message: uploadError.message || "Image upload failed"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Image file is required"
        });
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      user.avatarUrl = fileToDataUrl(req.file);
      await user.save();

      res.json(userResponse(user));
    } catch (error) {
      console.error("Avatar update error:", error);
      res.status(500).json({
        message: error.message || "Avatar update failed"
      });
    }
  });
});

router.put("/status", protect, async (req, res) => {
  try {
    const { status } = req.body || {};

    if (!["online", "idle", "dnd", "offline"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.status = status;
    await user.save();

    req.app.get("io")?.emit("status-updated", {
      userId: user._id,
      status: user.status
    });

    res.json({
      message: "Status updated",
      status: user.status
    });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({
      message: "Status update failed"
    });
  }
});

module.exports = router;
