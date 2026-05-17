import { Crown, ShieldCheck, AtSign } from "lucide-react";

export default function MembersPanel({ server }) {
  if (!server) {
    return <aside className="members-panel" />;
  }

  const validMembers = server.members?.filter((m) => m?.user?._id) || [];
  const owners = validMembers.filter((m) => m.role === "owner");
  const admins = validMembers.filter((m) => m.role === "admin");
  const moderators = validMembers.filter((m) => m.role === "moderator");
  const members = validMembers.filter((m) => m.role === "member");

  const copyMention = (username) => {
    navigator.clipboard.writeText(`@${username}`);
  };

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

      <button
        className="mention-copy-btn"
        title="Copy mention"
        onClick={() => copyMention(member.user.username)}
      >
        <AtSign size={14} />
      </button>
    </div>
  );

  return (
    <aside className="members-panel upgraded-members">
      <div className="members-card">
        <h4>Server Stats</h4>

        <div className="stats-grid">
          <div>
            <strong>{validMembers.length}</strong>
            <span>Members</span>
          </div>

          <div>
            <strong>{owners.length}</strong>
            <span>Owners</span>
          </div>
        </div>
      </div>

      <h4>Members - {validMembers.length}</h4>

      {owners.length > 0 && (
        <>
          <div className="member-group-title">Owner</div>
          {owners.map(renderMember)}
        </>
      )}

      {admins.length > 0 && (
        <>
          <div className="member-group-title">Admins</div>
          {admins.map(renderMember)}
        </>
      )}

      {moderators.length > 0 && (
        <>
          <div className="member-group-title">Moderators</div>
          {moderators.map(renderMember)}
        </>
      )}

      {members.length > 0 && (
        <>
          <div className="member-group-title">Community</div>
          {members.map(renderMember)}
        </>
      )}
    </aside>
  );
}
