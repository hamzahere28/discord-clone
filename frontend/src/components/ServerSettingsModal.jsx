import { useState } from "react";
import {
  Save,
  RefreshCcw,
  Trash2,
  ShieldCheck,
  Crown,
  Lock,
  Settings,
  UserX,
  Ban,
  RotateCcw,
  MessageSquareX
} from "lucide-react";
import API from "../api";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";

const PERMISSION_LABELS = {
  manageServer: "Manage Server",
  manageRoles: "Manage Roles",
  createChannels: "Create Channels",
  deleteChannels: "Delete Channels",
  pinMessages: "Pin Messages",
  deleteMessages: "Delete Messages",
  kickMembers: "Kick Members",
  banMembers: "Ban Members",
  clearMessages: "Clear Messages"
};

const editableRoles = ["admin", "moderator", "member"];

const ROLE_META = {
  owner: {
    label: "Owner",
    tone: "owner",
    description: "Full server control and permanent ownership."
  },
  admin: {
    label: "Admin",
    tone: "admin",
    description: "Trusted staff with broad management access."
  },
  moderator: {
    label: "Moderator",
    tone: "moderator",
    description: "Keeps chat clean and handles member safety."
  },
  member: {
    label: "Member",
    tone: "member",
    description: "Default community access."
  }
};

const PERMISSION_PRESETS = {
  admin: {
    manageServer: true,
    manageRoles: true,
    createChannels: true,
    deleteChannels: true,
    pinMessages: true,
    deleteMessages: true,
    kickMembers: true,
    banMembers: true,
    clearMessages: true
  },
  moderator: {
    manageServer: false,
    manageRoles: false,
    createChannels: true,
    deleteChannels: false,
    pinMessages: true,
    deleteMessages: true,
    kickMembers: true,
    banMembers: false,
    clearMessages: false
  },
  member: {
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
};

export default function ServerSettingsModal({
  server,
  onClose,
  refreshServers
}) {
  const { user } = useAuth();

  const [name, setName] = useState(server?.name || "");
  const [icon, setIcon] = useState(server?.icon || "");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [localServer, setLocalServer] = useState(server);
  const validMembers = localServer?.members?.filter((m) => m?.user?._id) || [];
  const validBannedUsers =
    localServer?.bannedUsers?.filter((ban) => ban?.user?._id) || [];

  const currentMember = validMembers.find(
    (m) => m.user?._id === user?._id
  );

  const currentRole = localServer?.roles?.find(
    (role) => role.name === currentMember?.role
  );

  const isOwner = currentMember?.role === "owner";
  const canManageServer =
    isOwner || Boolean(currentRole?.permissions?.manageServer);
  const canManageRoles =
    isOwner || Boolean(currentRole?.permissions?.manageRoles);
  const canKickMembers =
    isOwner || Boolean(currentRole?.permissions?.kickMembers);
  const canBanMembers =
    isOwner || Boolean(currentRole?.permissions?.banMembers);
  const canClearMessages =
    isOwner || Boolean(currentRole?.permissions?.clearMessages);

  const roleCounts = validMembers.reduce((counts, member) => {
    counts[member.role] = (counts[member.role] || 0) + 1;
    return counts;
  }, {});

  const syncServer = async () => {
    await refreshServers();
  };

  const updateServer = async (e) => {
    e.preventDefault();

    if (!canManageServer) {
      alert("No permission to manage server");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.put(`/servers/${localServer._id}`, {
        name,
        icon
      });

      setLocalServer(data);
      await syncServer();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update server");
    } finally {
      setLoading(false);
    }
  };

  const regenerateInvite = async () => {
    if (!canManageServer) {
      alert("No permission to manage server");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.put(
        `/servers/${localServer._id}/regenerate-invite`
      );

      setLocalServer(data);
      await syncServer();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to regenerate invite");
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (memberUserId, role) => {
    if (!canManageRoles) {
      alert("No permission to manage roles");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.put(`/servers/${localServer._id}/role`, {
        userId: memberUserId,
        role
      });

      setLocalServer(data);
      await syncServer();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (roleName, permissionKey, currentValue) => {
    if (!canManageRoles) {
      alert("No permission to manage roles");
      return;
    }

    const role = localServer.roles.find((item) => item.name === roleName);

    if (!role) return;

    const nextPermissions = {
      ...role.permissions,
      [permissionKey]: !currentValue
    };

    try {
      setLoading(true);

      const { data } = await API.put(
        `/servers/${localServer._id}/permissions/${roleName}`,
        {
          permissions: nextPermissions
        }
      );

      setLocalServer(data);
      await syncServer();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update permissions");
    } finally {
      setLoading(false);
    }
  };

  const applyPermissionPreset = async (roleName) => {
    if (!canManageRoles) {
      alert("No permission to manage roles");
      return;
    }

    try {
      setLoading(true);

      const { data } = await API.put(
        `/servers/${localServer._id}/permissions/${roleName}`,
        {
          permissions: PERMISSION_PRESETS[roleName]
        }
      );

      setLocalServer(data);
      await syncServer();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to apply preset");
    } finally {
      setLoading(false);
    }
  };

  const kickMember = async (memberUserId, username) => {
    const ok = confirm(`Kick ${username} from this server?`);
    if (!ok) return;

    try {
      setLoading(true);

      const { data } = await API.put(`/servers/${localServer._id}/kick`, {
        userId: memberUserId
      });

      setLocalServer(data.server);
      await syncServer();
      alert(data.message || "Member kicked");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to kick member");
    } finally {
      setLoading(false);
    }
  };

  const banMember = async (memberUserId, username) => {
    const reason = prompt(`Reason for banning ${username}?`) || "";

    const ok = confirm(`Ban ${username} from this server?`);
    if (!ok) return;

    try {
      setLoading(true);

      const { data } = await API.put(`/servers/${localServer._id}/ban`, {
        userId: memberUserId,
        reason
      });

      setLocalServer(data.server);
      await syncServer();
      alert(data.message || "Member banned");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to ban member");
    } finally {
      setLoading(false);
    }
  };

  const unbanUser = async (bannedUserId, username) => {
    const ok = confirm(`Unban ${username}?`);
    if (!ok) return;

    try {
      setLoading(true);

      const { data } = await API.put(`/servers/${localServer._id}/unban`, {
        userId: bannedUserId
      });

      setLocalServer(data.server);
      await syncServer();
      alert(data.message || "User unbanned");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to unban user");
    } finally {
      setLoading(false);
    }
  };

  const clearServerMessages = async () => {
    const ok = confirm(
      "Clear ALL messages in this server? This cannot be undone."
    );

    if (!ok) return;

    try {
      setLoading(true);

      const { data } = await API.delete(`/servers/${localServer._id}/messages`);

      await syncServer();
      alert(data.message || "Server messages cleared");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to clear messages");
    } finally {
      setLoading(false);
    }
  };

  const deleteServer = async () => {
    const confirmDelete = confirm(
      "Are you sure you want to delete this server?"
    );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      await API.delete(`/servers/${localServer._id}`);

      await syncServer();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Server Settings" onClose={onClose}>
      <div className="settings-tabs">
        <button
          className={activeTab === "general" ? "active" : ""}
          onClick={() => setActiveTab("general")}
          type="button"
        >
          <Settings size={16} />
          General
        </button>

        <button
          className={activeTab === "roles" ? "active" : ""}
          onClick={() => setActiveTab("roles")}
          type="button"
        >
          <ShieldCheck size={16} />
          Roles
        </button>

        <button
          className={activeTab === "permissions" ? "active" : ""}
          onClick={() => setActiveTab("permissions")}
          type="button"
        >
          <Lock size={16} />
          Permissions
        </button>

        <button
          className={activeTab === "moderation" ? "active" : ""}
          onClick={() => setActiveTab("moderation")}
          type="button"
        >
          <Ban size={16} />
          Moderation
        </button>
      </div>

      {activeTab === "general" && (
        <>
          <form className="server-settings-form" onSubmit={updateServer}>
            <div className="server-settings-preview">
              <div className="server-settings-icon">
                {icon || name?.charAt(0)?.toUpperCase()}
              </div>

              <div>
                <h3>{name || "Server Name"}</h3>
                <p>Invite Code: {localServer.inviteCode}</p>
              </div>
            </div>

            <label>Server Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Server name"
              required
              disabled={!canManageServer}
            />

            <label>Server Icon Letter</label>
            <input
              value={icon}
              maxLength={2}
              onChange={(e) => setIcon(e.target.value.toUpperCase())}
              placeholder="Example: H"
              disabled={!canManageServer}
            />

            <button
              className="settings-save-btn"
              disabled={loading || !canManageServer}
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <div className="server-danger-zone">
            <h3>Danger Zone</h3>

            <button
              onClick={regenerateInvite}
              disabled={loading || !canManageServer}
              type="button"
            >
              <RefreshCcw size={18} />
              Regenerate Invite
            </button>

            {canClearMessages && (
              <button
                className="clear-messages-btn"
                onClick={clearServerMessages}
                disabled={loading}
                type="button"
              >
                <MessageSquareX size={18} />
                Clear Server Messages
              </button>
            )}

            {isOwner && (
              <button
                className="delete-server-btn"
                onClick={deleteServer}
                disabled={loading}
                type="button"
              >
                <Trash2 size={18} />
                Delete Server
              </button>
            )}
          </div>
        </>
      )}

      {activeTab === "roles" && (
        <div className="roles-management-box">
          <h3>
            <ShieldCheck size={18} />
            Role Management
          </h3>

          <div className="role-overview-grid">
            {Object.entries(ROLE_META).map(([roleName, meta]) => (
              <div className={`role-overview-card ${meta.tone}`} key={roleName}>
                <span>{meta.label}</span>
                <strong>{roleCounts[roleName] || 0}</strong>
                <small>{meta.description}</small>
              </div>
            ))}
          </div>

          {!canManageRoles && (
            <p className="settings-warning">
              You do not have permission to manage roles.
            </p>
          )}

          {validMembers.map((member) => (
            <div className="role-row" key={member.user._id}>
              <div className="role-user">
                <div className="role-avatar">
                  {member.user?.avatar || member.user?.username?.charAt(0)}
                </div>

                <div>
                  <strong>
                    {member.user?.username}

                    {member.role === "owner" && (
                      <Crown size={14} className="role-icon owner-icon" />
                    )}
                  </strong>
                  <span>{member.user?.email}</span>
                </div>
              </div>

              <div className="role-row-actions">
                <span className={`role-badge ${ROLE_META[member.role]?.tone || "member"}`}>
                  {ROLE_META[member.role]?.label || member.role}
                </span>

                <select
                  value={member.role}
                  disabled={member.role === "owner" || loading || !canManageRoles}
                  onChange={(e) =>
                    updateRole(member.user._id, e.target.value)
                  }
                >
                  <option value="owner" disabled>
                    owner
                  </option>
                  <option value="admin">admin</option>
                  <option value="moderator">moderator</option>
                  <option value="member">member</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "permissions" && (
        <div className="permissions-panel">
          <h3>
            <Lock size={18} />
            Role Permissions
          </h3>

          {!canManageRoles && (
            <p className="settings-warning">
              You do not have permission to edit permissions.
            </p>
          )}

          {editableRoles.map((roleName) => {
            const role = localServer.roles?.find((item) => item.name === roleName);
            const permissions = role?.permissions || {};

            return (
              <div className="permission-role-card" key={roleName}>
                <div className="permission-card-header">
                  <div>
                    <h4>{ROLE_META[roleName]?.label || roleName}</h4>
                    <span>{ROLE_META[roleName]?.description}</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading || !canManageRoles}
                    onClick={() => applyPermissionPreset(roleName)}
                  >
                    Apply Preset
                  </button>
                </div>

                <div className="permission-grid">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                    <label className="permission-toggle" key={key}>
                      <span>{label}</span>

                      <input
                        type="checkbox"
                        checked={Boolean(permissions[key])}
                        disabled={loading || !canManageRoles}
                        onChange={() =>
                          togglePermission(roleName, key, Boolean(permissions[key]))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "moderation" && (
        <div className="moderation-panel">
          <h3>
            <Ban size={18} />
            Moderation Panel
          </h3>

          {!canKickMembers && !canBanMembers && !canClearMessages && (
            <p className="settings-warning">
              You do not have moderation permissions.
            </p>
          )}

          <div className="moderation-section">
            <h4>Members</h4>

            {validMembers.map((member) => {
              const isTargetOwner = member.role === "owner";
              const isSelf = member.user._id === user?._id;

              return (
                <div className="moderation-row" key={member.user._id}>
                  <div className="role-user">
                    <div className="role-avatar">
                      {member.user?.avatar || member.user?.username?.charAt(0)}
                    </div>

                    <div>
                      <strong>{member.user?.username}</strong>
                      <span>{member.role}</span>
                    </div>
                  </div>

                  <div className="moderation-actions">
                    <button
                      type="button"
                      disabled={
                        loading ||
                        !canKickMembers ||
                        isTargetOwner ||
                        isSelf
                      }
                      onClick={() =>
                        kickMember(member.user._id, member.user.username)
                      }
                    >
                      <UserX size={15} />
                      Kick
                    </button>

                    <button
                      type="button"
                      className="danger"
                      disabled={
                        loading ||
                        !canBanMembers ||
                        isTargetOwner ||
                        isSelf
                      }
                      onClick={() =>
                        banMember(member.user._id, member.user.username)
                      }
                    >
                      <Ban size={15} />
                      Ban
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="moderation-section">
            <h4>Banned Users</h4>

            {validBannedUsers.length === 0 && (
              <p className="empty-moderation-text">No banned users.</p>
            )}

            {validBannedUsers.map((ban) => (
              <div className="moderation-row" key={ban.user._id}>
                <div className="role-user">
                  <div className="role-avatar">
                    {ban.user?.avatar || ban.user?.username?.charAt(0)}
                  </div>

                  <div>
                    <strong>{ban.user?.username}</strong>
                    <span>{ban.reason || "No reason"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !canBanMembers}
                  onClick={() => unbanUser(ban.user._id, ban.user.username)}
                >
                  <RotateCcw size={15} />
                  Unban
                </button>
              </div>
            ))}
          </div>

          {canClearMessages && (
            <div className="server-danger-zone">
              <h3>Message Moderation</h3>

              <button
                className="clear-messages-btn"
                onClick={clearServerMessages}
                disabled={loading}
                type="button"
              >
                <MessageSquareX size={18} />
                Clear Server Messages
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
