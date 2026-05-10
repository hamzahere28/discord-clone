import { useEffect, useState } from "react";
import API from "../api";
import socket from "../socket";
import ServerBar from "../components/Serverbar";
import ChannelSidebar from "../components/Channelsidebar";
import ChatWindow from "../components/Chatwindow";
import MembersPanel from "../components/Memberspanel";

export default function DiscordApp() {
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);

  const fetchServers = async () => {
    const { data } = await API.get("/servers");
    setServers(data);

    if (data.length > 0 && !activeServer) {
      setActiveServer(data[0]);
    }
  };

  const fetchChannels = async (serverId) => {
    const { data } = await API.get(`/channels/${serverId}`);
    setChannels(data);

    if (data.length > 0) {
      setActiveChannel(data[0]);
    } else {
      setActiveChannel(null);
    }
  };

  useEffect(() => {
    socket.connect();

    fetchServers();

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeServer) {
      fetchChannels(activeServer._id);
    }
  }, [activeServer]);

  return (
    <div className="discord-layout">
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
        setActiveChannel={setActiveChannel}
        refreshChannels={() => fetchChannels(activeServer?._id)}
      />

      <ChatWindow
        server={activeServer}
        channel={activeChannel}
      />

      <MembersPanel server={activeServer} />
    </div>
  );
}