import { Plus, Compass } from "lucide-react";
import { useState } from "react";
import API from "../api";
import Modal from "./Modal";

export default function ServerBar({
  servers,
  activeServer,
  setActiveServer,
  refreshServers
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const createServer = async (e) => {
    e.preventDefault();

    await API.post("/servers", {
      name
    });

    setName("");
    setShowCreate(false);
    refreshServers();
  };

  const joinServer = async (e) => {
    e.preventDefault();

    await API.post(`/servers/join/${inviteCode}`);

    setInviteCode("");
    setShowJoin(false);
    refreshServers();
  };

  return (
    <div className="server-bar">
      <div className="server-logo">D</div>

      <div className="server-separator" />

      {servers.map((server) => (
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
          {server.icon || server.name.charAt(0)}
        </button>
      ))}

      <button className="server-icon action" onClick={() => setShowCreate(true)}>
        <Plus size={22} />
      </button>

      <button className="server-icon action" onClick={() => setShowJoin(true)}>
        <Compass size={22} />
      </button>

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

            <button>Create server</button>
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

            <button>Join server</button>
          </form>
        </Modal>
      )}
    </div>
  );
}