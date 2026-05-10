import { Crown, ShieldCheck } from "lucide-react";

export default function MembersPanel({ server }) {
  if (!server) {
    return <aside className="members-panel" />;
  }

  const owners = server.members?.filter((m) => m.role === "owner") || [];
  const members = server.members?.filter((m) => m.role !== "owner") || [];

  const renderMember = (member) => (
    <div className="member-item detailed-member" key={member.user._id}>
      <div className="member-avatar">
        {member.user.avatar || member.user.username.charAt(0)}
        <span className={`status-dot ${member.user.status}`} />
      </div>

      <div>
        <strong>
          {member.user.username}

          {member.role === "owner" && (
            <Crown size={14} className="role-icon owner-icon" />
          )}

          {member.role === "admin" && (
            <ShieldCheck size={14} className="role-icon admin-icon" />
          )}
        </strong>

        <span>{member.role}</span>
      </div>
    </div>
  );

  return (
    <aside className="members-panel upgraded-members">
      <div className="members-card">
        <h4>Server Stats</h4>

        <div className="stats-grid">
          <div>
            <strong>{server.members?.length || 0}</strong>
            <span>Members</span>
          </div>

          <div>
            <strong>{owners.length}</strong>
            <span>Owners</span>
          </div>
        </div>
      </div>

      <h4>Members — {server.members?.length || 0}</h4>

      <div className="member-group-title">Owner</div>
      {owners.map(renderMember)}

      <div className="member-group-title">Community</div>
      {members.map(renderMember)}
    </aside>
  );
}