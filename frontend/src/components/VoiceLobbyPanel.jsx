import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Bug,
  Volume2
} from "lucide-react";

export default function VoiceLobbyPanel({
  voiceChannel,
  voiceUsers,
  voiceMuted,
  voiceDeafened,
  voiceDebugOpen,
  setVoiceDebugOpen,
  peerCount,
  speaking,
  micStatus,
  leaveVoiceChannel,
  toggleVoiceMute,
  toggleVoiceDeafen
}) {
  if (!voiceChannel) return null;

  return (
    <div className="voice-lobby-panel">
      <div className="voice-lobby-header">
        <div>
          <h3>
            <Volume2 size={18} />
            {voiceChannel.name}
          </h3>
          <p>{voiceUsers.length} connected</p>
        </div>

        <button className="voice-leave-big" onClick={leaveVoiceChannel}>
          <PhoneOff size={18} />
          Leave
        </button>
      </div>

      <div className="voice-lobby-users">
        {voiceUsers.map((voiceUser) => (
          <div
            className={
              speaking ? "voice-lobby-user speaking" : "voice-lobby-user"
            }
            key={voiceUser.socketId}
          >
            <div className="voice-lobby-avatar">
              {voiceUser.avatar || voiceUser.username?.charAt(0) || "U"}
            </div>

            <div>
              <strong>{voiceUser.username}</strong>
              <span>
                {voiceUser.muted ? "Muted" : "Mic on"}
                {voiceUser.deafened ? " • Deafened" : ""}
              </span>
            </div>

            <div className="voice-lobby-icons">
              {voiceUser.muted && <MicOff size={15} />}
              {voiceUser.deafened && <Headphones size={15} />}
            </div>
          </div>
        ))}
      </div>

      <div className="voice-lobby-controls">
        <button
          className={voiceMuted ? "active" : ""}
          onClick={toggleVoiceMute}
        >
          {voiceMuted ? <MicOff size={20} /> : <Mic size={20} />}
          {voiceMuted ? "Unmute" : "Mute"}
        </button>

        <button
          className={voiceDeafened ? "active" : ""}
          onClick={toggleVoiceDeafen}
        >
          <Headphones size={20} />
          Deafen
        </button>

        <button
          className={voiceDebugOpen ? "active" : ""}
          onClick={() => setVoiceDebugOpen(!voiceDebugOpen)}
        >
          <Bug size={20} />
          Debug
        </button>
      </div>

      {voiceDebugOpen && (
        <div className="voice-lobby-debug">
          <div>
            <span>Mic</span>
            <strong>{micStatus}</strong>
          </div>

          <div>
            <span>Peers</span>
            <strong>{peerCount}</strong>
          </div>

          <div>
            <span>Speaking</span>
            <strong>{speaking ? "yes" : "no"}</strong>
          </div>

          <div>
            <span>Muted</span>
            <strong>{voiceMuted ? "yes" : "no"}</strong>
          </div>

          <div>
            <span>Deafened</span>
            <strong>{voiceDeafened ? "yes" : "no"}</strong>
          </div>
        </div>
      )}
    </div>
  );
}