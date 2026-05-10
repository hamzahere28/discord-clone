import { useState } from "react";
import { Camera, Save } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "../context/authContext";

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();

  const [form, setForm] = useState({
    username: user?.username || "",
    avatar: user?.avatar || "",
    status: user?.status || "online"
  });

  const [saving, setSaving] = useState(false);

  const submitHandler = async (e) => {
    e.preventDefault();

    setSaving(true);

    await updateProfile(form);

    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Edit Profile" onClose={onClose}>
      <form className="profile-form" onSubmit={submitHandler}>
        <div className="profile-preview-card">
          <div className="profile-banner" />

          <div className="profile-avatar-large">
            {form.avatar || form.username.charAt(0).toUpperCase()}
            <span className={`profile-status-dot ${form.status}`} />
          </div>

          <div className="profile-preview-info">
            <h3>{form.username || "Your Name"}</h3>
            <p>{user.email}</p>
          </div>
        </div>

        <label>Display name</label>
        <input
          value={form.username}
          onChange={(e) =>
            setForm({
              ...form,
              username: e.target.value
            })
          }
          placeholder="Your display name"
        />

        <label>Avatar text</label>
        <div className="input-icon-row">
          <Camera size={18} />
          <input
            value={form.avatar}
            maxLength={2}
            onChange={(e) =>
              setForm({
                ...form,
                avatar: e.target.value.toUpperCase()
              })
            }
            placeholder="Example: H"
          />
        </div>

        <label>Status</label>
        <select
          value={form.status}
          onChange={(e) =>
            setForm({
              ...form,
              status: e.target.value
            })
          }
        >
          <option value="online">Online</option>
          <option value="idle">Idle</option>
          <option value="dnd">Do Not Disturb</option>
          <option value="offline">Invisible</option>
        </select>

        <button className="save-profile-btn" disabled={saving}>
          <Save size={18} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
}