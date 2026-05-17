const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { _id: false }
);

const pollOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { _id: true }
);

const messageSchema = new mongoose.Schema(
  {
    content: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    fileType: { type: String, default: "" },

    type: {
      type: String,
      enum: ["text", "poll"],
      default: "text"
    },

    poll: {
      question: { type: String, default: "" },
      options: { type: [pollOptionSchema], default: [] }
    },

    reactions: { type: [reactionSchema], default: [] },
    isPinned: { type: Boolean, default: false },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },

    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true
    },

    server: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Server",
      required: true,
      index: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

messageSchema.index({ channel: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);