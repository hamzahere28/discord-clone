import { Camera, Save, User, FileText, Circle, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function ProfileModal({ onClose }) {
  const { user, updateProfile: saveProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [status, setStatus] = useState(user?.status || "online");
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(
    user?.avatarUrl
      ? user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http")
        ? user.avatarUrl
        : `${BACKEND_URL}${user.avatarUrl}`
      : ""
  );
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const selected = e.target.files?.[0];

    if (!selected) return;

    setProfileImage(selected);
    setPreviewImage(URL.createObjectURL(selected));
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("avatar", avatar.trim().slice(0, 2).toUpperCase());
      formData.append("bio", bio.trim());
      formData.append("status", status);

      if (profileImage) {
        formData.append("avatarImage", profileImage);
      }

      await saveProfile(formData);
      onClose();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.message ||
          "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const avatarText =
    avatar ||
    username?.charAt(0)?.toUpperCase() ||
    user?.username?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="clean-profile-overlay" onClick={onClose}>
      <form
        className="clean-profile-modal"
        onSubmit={updateProfile}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="clean-profile-header">
          <div className="clean-title-wrap">
            <div className="clean-title-icon">
              <User size={24} />
            </div>

            <div>
              <h2>Edit Profile</h2>
              <p>Customize how you appear to others</p>
            </div>
          </div>

          <button type="button" className="clean-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="clean-profile-card">
          <div className="clean-banner" />

          <div className="clean-profile-main">
            <div className="clean-avatar-large">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    setPreviewImage("");
                  }}
                />
              ) : (
                <span>{avatarText}</span>
              )}

              <small className={`clean-status ${status}`} />
            </div>

            <div className="clean-user-info">
              <h3>{username || "Your name"}</h3>
              <p>{user?.email}</p>
            </div>

            <label className="clean-change-img">
              <Camera size={17} />
              Change Image
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          </div>
        </div>

        <div className="clean-upload-box">
          <label className="clean-upload-circle">
            <Camera size={24} />
            <strong>Upload Image</strong>
            <span>PNG, JPG, GIF</span>
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          <div className="clean-file-info">
            <label className="clean-file-btn">
              Choose File
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            <span>{profileImage ? profileImage.name : "No file chosen"}</span>
          </div>
        </div>

        <label className="clean-label">Display Name</label>
        <div className="clean-input">
          <User size={18} />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Display name"
            required
          />
        </div>

        <label className="clean-label">Avatar Text</label>
        <div className="clean-input">
          <div className="clean-mini-avatar">{avatarText}</div>
          <input
            value={avatar}
            maxLength={2}
            onChange={(e) => setAvatar(e.target.value.toUpperCase())}
            placeholder="Example: S"
          />
        </div>

        <label className="clean-label">Bio</label>
        <div className="clean-input">
          <FileText size={18} />
          <input
            value={bio}
            maxLength={190}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
          />
          <small>{bio.length}/190</small>
        </div>

        <label className="clean-label">Status</label>
        <div className="clean-input">
          <Circle size={14} className={`clean-status-icon ${status}`} />

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="dnd">Do Not Disturb</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <div className="clean-profile-actions">
          <button type="button" className="cancel" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" disabled={loading}>
            <Save size={18} />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
