const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema(
  {
    manageServer: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    createChannels: { type: Boolean, default: false },
    deleteChannels: { type: Boolean, default: false },
    pinMessages: { type: Boolean, default: false },
    deleteMessages: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    clearMessages: { type: Boolean, default: false }
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["owner", "admin", "moderator", "member"],
      required: true
    },
    permissions: {
      type: permissionsSchema,
      default: {}
    }
  },
  { _id: false }
);

const bannedUserSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reason: {
      type: String,
      default: ""
    },
    bannedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const defaultRoles = [
  {
    name: "owner",
    permissions: {
      manageServer: true,
      manageRoles: true,
      createChannels: true,
      deleteChannels: true,
      pinMessages: true,
      deleteMessages: true,
      kickMembers: true,
      banMembers: true,
      clearMessages: true
    }
  },
  {
    name: "admin",
    permissions: {
      manageServer: true,
      manageRoles: false,
      createChannels: true,
      deleteChannels: true,
      pinMessages: true,
      deleteMessages: true,
      kickMembers: true,
      banMembers: true,
      clearMessages: true
    }
  },
  {
    name: "moderator",
    permissions: {
      manageServer: false,
      manageRoles: false,
      createChannels: true,
      deleteChannels: false,
      pinMessages: true,
      deleteMessages: true,
      kickMembers: true,
      banMembers: false,
      clearMessages: true
    }
  },
  {
    name: "member",
    permissions: {
      manageServer: false,
      manageRoles: false,
      createChannels: false,
      deleteChannels: false,
      pinMessages: false,
      deleteMessages: false,
      kickMembers: false,
      banMembers: false,
      clearMessages: false
    }
  }
];

const serverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    icon: { type: String, default: "" },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        role: {
          type: String,
          enum: ["owner", "admin", "moderator", "member"],
          default: "member"
        }
      }
    ],

    roles: {
      type: [roleSchema],
      default: defaultRoles
    },

    bannedUsers: {
      type: [bannedUserSchema],
      default: []
    },

    inviteCode: {
      type: String,
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

serverSchema.methods.getMember = function (userId) {
  return this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
};

serverSchema.methods.getRolePermissions = function (roleName) {
  const role = this.roles.find((r) => r.name === roleName);
  if (!role) return {};
  return role.permissions || {};
};

serverSchema.methods.memberHasPermission = function (userId, permission) {
  const member = this.getMember(userId);

  if (!member) return false;
  if (member.role === "owner") return true;

  const permissions = this.getRolePermissions(member.role);
  return Boolean(permissions[permission]);
};

serverSchema.pre("save", function () {
  if (!this.roles || this.roles.length === 0) {
    this.roles = [...defaultRoles];
  }

  const existingRoleNames = this.roles.map((role) => role.name);

  defaultRoles.forEach((defaultRole) => {
    if (!existingRoleNames.includes(defaultRole.name)) {
      this.roles.push(defaultRole);
    }
  });
});

module.exports = mongoose.model("Server", serverSchema);