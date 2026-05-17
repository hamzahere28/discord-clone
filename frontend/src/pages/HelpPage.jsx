import { HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HelpPage() {
  const navigate = useNavigate();

  return (
    <div className="feature-page">
      <div className="feature-shell">
        <button className="feature-back" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to Chat
        </button>

        <div className="feature-header-card">
          <div className="feature-icon">
            <HelpCircle size={32} />
          </div>

          <div>
            <h1>Help Center</h1>
            <p>Quick help for using your Discord clone.</p>
          </div>
        </div>

        <div className="feature-grid">
          <div className="feature-item-card">
            <strong>How to create a server?</strong>
            <p>Click the green plus button on the left sidebar.</p>
          </div>

          <div className="feature-item-card">
            <strong>How to join a server?</strong>
            <p>Click the compass button and enter an invite code.</p>
          </div>

          <div className="feature-item-card">
            <strong>How to edit profile?</strong>
            <p>Click the settings button near your username.</p>
          </div>
        </div>
      </div>
    </div>
  );
}