import { Plus, Compass } from "lucide-react";
import { useState } from "react";
import API from "../api";
import Modal from "./Modal";

export default function ServerBar({
  servers = [],
  activeServer,
  setActiveServer,
  refreshServers
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const createServer = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert("Enter server name");

    try {
      setLoading(true);

      const { data } = await API.post("/servers", {
        name: name.trim()
      });

      setName("");
      setShowCreate(false);

      await refreshServers();

      if (data?._id) {
        setActiveServer(data);
      }
    } catch (error) {
      console.log("Create server error:", error.response?.data || error);
      alert(error.response?.data?.message || "Failed to create server");
    } finally {
      setLoading(false);
    }
  };

  const joinServer = async (e) => {
    e.preventDefault();

    if (!inviteCode.trim()) return alert("Enter invite code");

    try {
      setLoading(true);

      await API.post(`/servers/join/${inviteCode.trim()}`);

      setInviteCode("");
      setShowJoin(false);

      await refreshServers();
    } catch (error) {
      console.log("Join server error:", error.response?.data || error);
      alert(error.response?.data?.message || "Failed to join server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="server-bar">
        <div className="server-logo">D</div>

        <div className="server-separator" />

        {Array.isArray(servers) &&
          servers.map((server) => (
            <button
              key={server._id}
              className={
                activeServer?._id === server._id
                  ? "server-icon active"
                  : "server-icon"
              }
              onClick={() => setActiveServer(server)}
              title={server.name}
            >
              {server.icon || server.name?.charAt(0).toUpperCase()}
            </button>
          ))}

        <button
          className="server-icon action"
          type="button"
          onClick={() => setShowCreate(true)}
          title="Create server"
        >
          <Plus size={22} />
        </button>

        <button
          className="server-icon action"
          type="button"
          onClick={() => setShowJoin(true)}
          title="Join server"
        >
          <Compass size={22} />
        </button>
      </div>

      {showCreate && (
        <Modal title="Create a server" onClose={() => setShowCreate(false)}>
          <form className="modal-form" onSubmit={createServer}>
            <p>Your server is where your community hangs out.</p>

            <input
              placeholder="Server name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create server"}
            </button>
          </form>
        </Modal>
      )}

      {showJoin && (
        <Modal title="Join a server" onClose={() => setShowJoin(false)}>
          <form className="modal-form" onSubmit={joinServer}>
            <p>Enter an invite code shared by another user.</p>

            <input
              placeholder="Invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Joining..." : "Join server"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}