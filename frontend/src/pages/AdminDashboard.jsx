import { ArrowLeft, Crown, Server, Trash2, Users, MessageSquare, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [servers, setServers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [statsRes, usersRes, serversRes] = await Promise.all([
        API.get("/admin/stats"),
        API.get("/admin/users"),
        API.get("/admin/servers")
      ]);

      setStats(statsRes.data);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setServers(Array.isArray(serversRes.data) ? serversRes.data : []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Admin access failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId, isAdmin) => {
    try {
      setMessage("");

      const { data } = await API.put(`/admin/users/${userId}/admin`, {
        isAdmin: !isAdmin
      });

      setMessage(data.message);
      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update admin");
    }
  };

  const deleteUser = async (userId) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;

    try {
      setMessage("");

      const { data } = await API.delete(`/admin/users/${userId}`);
      setMessage(data.message);
      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete user");
    }
  };

  const deleteServer = async (serverId) => {
    const ok = window.confirm("Delete this server and all messages?");
    if (!ok) return;

    try {
      setMessage("");

      const { data } = await API.delete(`/admin/servers/${serverId}`);
      setMessage(data.message);
      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete server");
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <button type="button" className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to App
        </button>

        <div className="admin-hero">
          <div className="feature-icon">
            <Crown size={34} />
          </div>

          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage users, servers, and platform stats.</p>
          </div>

          <button type="button" className="admin-refresh-btn" onClick={fetchAdminData}>
            <RefreshCcw size={17} />
            Refresh
          </button>
        </div>

        {message && <div className="admin-message">{message}</div>}

        {loading && <div className="admin-message">Loading admin data...</div>}

        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <Users size={26} />
            <strong>{stats?.usersCount || 0}</strong>
            <span>Total Users</span>
          </div>

          <div className="admin-stat-card">
            <Server size={26} />
            <strong>{stats?.serversCount || 0}</strong>
            <span>Total Servers</span>
          </div>

          <div className="admin-stat-card">
            <MessageSquare size={26} />
            <strong>{stats?.messagesCount || 0}</strong>
            <span>Total Messages</span>
          </div>

          <div className="admin-stat-card">
            <Crown size={26} />
            <strong>{stats?.onlineUsers || 0}</strong>
            <span>Online Users</span>
          </div>
        </div>

        <div className="admin-section">
          <h2>Users</h2>

          <div className="admin-table">
            {users.map((adminUser) => (
              <div className="admin-row" key={adminUser._id}>
                <div>
                  <strong>{adminUser.username}</strong>
                  <span>{adminUser.email}</span>
                </div>

                <small>{adminUser.isAdmin ? "Admin" : "User"}</small>

                <button
                  type="button"
                  onClick={() => toggleAdmin(adminUser._id, adminUser.isAdmin)}
                >
                  {adminUser.isAdmin ? "Remove Admin" : "Make Admin"}
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteUser(adminUser._id)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2>Servers</h2>

          <div className="admin-table">
            {servers.map((server) => (
              <div className="admin-row" key={server._id}>
                <div>
                  <strong>{server.name}</strong>
                  <span>
                    Owner: {server.owner?.username || "Unknown"} •{" "}
                    {server.members?.length || 0} members
                  </span>
                </div>

                <small>{server.inviteCode}</small>

                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteServer(server._id)}
                >
                  Delete Server
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}