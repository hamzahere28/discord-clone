import { useEffect, useRef, useState } from "react";
import API from "../api";
import socket from "../socket";
import { useAuth } from "../context/AuthContext";

import ServerBar from "../components/Serverbar";
import ChannelSidebar from "../components/Channelsidebar";
import ChatWindow from "../components/Chatwindow";
import MembersPanel from "../components/Memberspanel";
import FriendsPanel from "../components/FriendsPanel";
import VoiceLobbyPanel from "../components/VoiceLobbyPanel";
import NotificationToasts from "../components/NotificationToasts";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

export default function DiscordApp() {
  const { user } = useAuth();

  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const [voiceChannel, setVoiceChannel] = useState(null);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceDeafened, setVoiceDeafened] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [voiceDebugOpen, setVoiceDebugOpen] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [micStatus, setMicStatus] = useState("idle");

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteAudiosRef = useRef({});
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const speakingIntervalRef = useRef(null);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, ...toast }]);
    setNotificationCount((prev) => prev + 1);

    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  const fetchServers = async () => {
    try {
      const { data } = await API.get("/servers");
      const serverList = Array.isArray(data) ? data : [];

      setServers(serverList);

      if (serverList.length > 0 && !activeServer) {
        setActiveServer(serverList[0]);
      }

      if (serverList.length === 0) {
        setActiveServer(null);
        setChannels([]);
        setActiveChannel(null);
      }
    } catch (error) {
      console.log("Fetch servers error:", error.response?.data || error);
      setServers([]);
      setActiveServer(null);
      setChannels([]);
      setActiveChannel(null);
    }
  };

  const fetchChannels = async (serverId) => {
    if (!serverId) return;

    try {
      const { data } = await API.get(`/channels/${serverId}`);
      const channelList = Array.isArray(data) ? data : [];

      setChannels(channelList);

      if (channelList.length > 0) {
        const firstTextChannel = channelList.find((c) => c.type === "text");
        setActiveChannel(firstTextChannel || channelList[0]);
      } else {
        setActiveChannel(null);
      }
    } catch (error) {
      console.log("Fetch channels error:", error.response?.data || error);
      setChannels([]);
      setActiveChannel(null);
    }
  };

  const selectChannel = (channel) => {
    if (channel.type === "voice") return;

    setActiveChannel(channel);
    setMobileSidebarOpen(false);

    setUnreadCounts((prev) => ({
      ...prev,
      [channel._id]: 0
    }));

    setNotificationCount(0);
  };

  const updatePeerCount = () => {
    setPeerCount(Object.keys(peerConnectionsRef.current).length);
  };

  const stopSpeakingMonitor = () => {
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setSpeaking(false);
  };

  const startSpeakingMonitor = (stream) => {
    stopSpeakingMonitor();

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      speakingIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || voiceMuted) {
          setSpeaking(false);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

        setSpeaking(average > 18);
      }, 180);
    } catch (error) {
      console.log("Speaking monitor error:", error);
    }
  };

  const stopLocalMic = () => {
    stopSpeakingMonitor();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setMicStatus("idle");
  };

  const closeAllPeerConnections = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};

    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });

    remoteAudiosRef.current = {};
    updatePeerCount();
  };

  const updateLocalMicMute = (muted) => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  };

  const createPeerConnection = (remoteSocketId) => {
    if (peerConnectionsRef.current[remoteSocketId]) {
      return peerConnectionsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(rtcConfig);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      let audio = remoteAudiosRef.current[remoteSocketId];

      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audio.playsInline = true;
        document.body.appendChild(audio);
        remoteAudiosRef.current[remoteSocketId] = audio;
      }

      audio.srcObject = event.streams[0];
      audio.muted = voiceDeafened;

      audio.play().catch((error) => {
        console.log("Remote audio play blocked:", error);
      });
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed" ||
        pc.connectionState === "disconnected"
      ) {
        pc.close();
        delete peerConnectionsRef.current[remoteSocketId];

        const audio = remoteAudiosRef.current[remoteSocketId];

        if (audio) {
          audio.pause();
          audio.srcObject = null;
          audio.remove();
          delete remoteAudiosRef.current[remoteSocketId];
        }

        updatePeerCount();
      }
    };

    peerConnectionsRef.current[remoteSocketId] = pc;
    updatePeerCount();

    return pc;
  };

  const callPeer = async (remoteSocketId) => {
    if (!localStreamRef.current || !remoteSocketId) return;

    const pc = createPeerConnection(remoteSocketId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      to: remoteSocketId,
      offer
    });
  };

  const joinVoiceChannel = async (channel, userData) => {
    if (!channel || !userData || voiceConnecting) return;

    try {
      setVoiceConnecting(true);
      setVoiceError("");
      setMicStatus("requesting");

      if (voiceChannel?._id) {
        socket.emit("leave-voice", {
          channelId: voiceChannel._id
        });
      }

      closeAllPeerConnections();
      stopLocalMic();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      localStreamRef.current = stream;
      setMicStatus("granted");
      startSpeakingMonitor(stream);

      setVoiceChannel(channel);
      setVoiceMuted(false);
      setVoiceDeafened(false);

      socket.emit("join-voice", {
        channelId: channel._id,
        user: userData
      });

      socket.emit("voice-state-change", {
        channelId: channel._id,
        muted: false,
        deafened: false
      });

      setMobileSidebarOpen(false);
    } catch (error) {
      console.log("Voice join error:", error);
      setMicStatus("blocked");
      setVoiceError("Microphone permission blocked or unavailable.");
      closeAllPeerConnections();
      stopLocalMic();
      setVoiceChannel(null);
      setVoiceUsers([]);
      setVoiceMuted(false);
      setVoiceDeafened(false);
    } finally {
      setVoiceConnecting(false);
    }
  };

  const leaveVoiceChannel = () => {
    if (voiceChannel?._id) {
      socket.emit("leave-voice", {
        channelId: voiceChannel._id
      });
    }

    closeAllPeerConnections();
    stopLocalMic();

    setVoiceChannel(null);
    setVoiceUsers([]);
    setVoiceMuted(false);
    setVoiceDeafened(false);
    setVoiceError("");
  };

  const toggleVoiceMute = () => {
    if (!voiceChannel?._id) return;

    const nextMuted = !voiceMuted;

    setVoiceMuted(nextMuted);
    updateLocalMicMute(nextMuted);

    socket.emit("voice-state-change", {
      channelId: voiceChannel._id,
      muted: nextMuted,
      deafened: voiceDeafened
    });
  };

  const toggleVoiceDeafen = () => {
    if (!voiceChannel?._id) return;

    const nextDeafened = !voiceDeafened;
    const nextMuted = nextDeafened ? true : voiceMuted;

    setVoiceDeafened(nextDeafened);
    setVoiceMuted(nextMuted);
    updateLocalMicMute(nextMuted);

    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.muted = nextDeafened;
    });

    socket.emit("voice-state-change", {
      channelId: voiceChannel._id,
      muted: nextMuted,
      deafened: nextDeafened
    });
  };

  useEffect(() => {
    socket.connect();
    fetchServers();

    return () => {
      closeAllPeerConnections();
      stopLocalMic();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeServer?._id) {
      fetchChannels(activeServer._id);
    }
  }, [activeServer]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      const messageChannelId =
        typeof message.channel === "object"
          ? message.channel._id
          : message.channel;

      if (!messageChannelId) return;

      if (activeChannel?._id !== messageChannelId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [messageChannelId]: (prev[messageChannelId] || 0) + 1
        }));
      }

      const senderName = message.sender?.username || "Someone";
      const text = message.content || "Sent an attachment";

      const mentionedMe =
        user?.username &&
        text.toLowerCase().includes(`@${user.username.toLowerCase()}`);

      const isMine = message.sender?._id === user?._id;

      if (!isMine && activeChannel?._id !== messageChannelId) {
        addToast({
          type: mentionedMe ? "mention" : "message",
          title: mentionedMe
            ? "You were mentioned"
            : `New message from ${senderName}`,
          message: text.slice(0, 80)
        });
      }
    };

    const handleServerMessagesCleared = ({ serverId }) => {
      if (activeServer?._id === serverId) {
        addToast({
          type: "message",
          title: "Messages cleared",
          message: "A moderator cleared server messages."
        });
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("server-messages-cleared", handleServerMessagesCleared);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("server-messages-cleared", handleServerMessagesCleared);
    };
  }, [activeChannel, activeServer, user]);

  useEffect(() => {
    const handleVoiceUsersUpdated = ({ channelId, users }) => {
      if (voiceChannel?._id === channelId) {
        setVoiceUsers(Array.isArray(users) ? users : []);
      }
    };

    const handleVoiceUserReady = async ({ channelId, socketId }) => {
      if (!voiceChannel?._id || voiceChannel._id !== channelId) return;
      if (socketId === socket.id) return;

      await callPeer(socketId);
    };

    const handleVoiceUserLeft = ({ socketId }) => {
      const pc = peerConnectionsRef.current[socketId];

      if (pc) {
        pc.close();
        delete peerConnectionsRef.current[socketId];
      }

      const audio = remoteAudiosRef.current[socketId];

      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
        delete remoteAudiosRef.current[socketId];
      }

      updatePeerCount();
    };

    const handleWebrtcOffer = async ({ from, offer }) => {
      if (!localStreamRef.current) return;

      const pc = createPeerConnection(from);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        to: from,
        answer
      });
    };

    const handleWebrtcAnswer = async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleWebrtcIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (!pc || !candidate) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.log("ICE candidate error:", error);
      }
    };

    socket.on("voice-users-updated", handleVoiceUsersUpdated);
    socket.on("voice-user-ready", handleVoiceUserReady);
    socket.on("voice-user-left", handleVoiceUserLeft);
    socket.on("webrtc-offer", handleWebrtcOffer);
    socket.on("webrtc-answer", handleWebrtcAnswer);
    socket.on("webrtc-ice-candidate", handleWebrtcIceCandidate);

    return () => {
      socket.off("voice-users-updated", handleVoiceUsersUpdated);
      socket.off("voice-user-ready", handleVoiceUserReady);
      socket.off("voice-user-left", handleVoiceUserLeft);
      socket.off("webrtc-offer", handleWebrtcOffer);
      socket.off("webrtc-answer", handleWebrtcAnswer);
      socket.off("webrtc-ice-candidate", handleWebrtcIceCandidate);
    };
  }, [voiceChannel, voiceDeafened]);

  return (
    <div className="discord-layout">
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <ServerBar
        servers={servers}
        activeServer={activeServer}
        setActiveServer={setActiveServer}
        refreshServers={fetchServers}
      />

      <ChannelSidebar
        server={activeServer}
        channels={channels}
        activeChannel={activeChannel}
        setActiveChannel={selectChannel}
        refreshChannels={() => fetchChannels(activeServer?._id)}
        refreshServers={fetchServers}
        unreadCounts={unreadCounts}
        mobileSidebarOpen={mobileSidebarOpen}
        closeMobileSidebar={() => setMobileSidebarOpen(false)}
        voiceChannel={voiceChannel}
        voiceUsers={voiceUsers}
        voiceMuted={voiceMuted}
        voiceDeafened={voiceDeafened}
        voiceConnecting={voiceConnecting}
        voiceError={voiceError}
        voiceDebugOpen={voiceDebugOpen}
        setVoiceDebugOpen={setVoiceDebugOpen}
        peerCount={peerCount}
        speaking={speaking}
        micStatus={micStatus}
        joinVoiceChannel={joinVoiceChannel}
        leaveVoiceChannel={leaveVoiceChannel}
        toggleVoiceMute={toggleVoiceMute}
        toggleVoiceDeafen={toggleVoiceDeafen}
      />

      <ChatWindow
        server={activeServer}
        channel={activeChannel}
        openMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <MembersPanel server={activeServer} />

      <FriendsPanel />

      <VoiceLobbyPanel
        voiceChannel={voiceChannel}
        voiceUsers={voiceUsers}
        voiceMuted={voiceMuted}
        voiceDeafened={voiceDeafened}
        voiceDebugOpen={voiceDebugOpen}
        setVoiceDebugOpen={setVoiceDebugOpen}
        peerCount={peerCount}
        speaking={speaking}
        micStatus={micStatus}
        leaveVoiceChannel={leaveVoiceChannel}
        toggleVoiceMute={toggleVoiceMute}
        toggleVoiceDeafen={toggleVoiceDeafen}
      />

      <NotificationToasts toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
