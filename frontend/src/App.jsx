import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DiscordApp from "./pages/DiscordApp";
import FriendsPage from "./pages/FriendsPage";
import DirectMessagesPage from "./pages/DirectMessagesPage";

import NotificationsPage from "./pages/NotificationsPage";
import PinnedPage from "./pages/PinnedPage";
import MembersPage from "./pages/MembersPage";
import InboxPage from "./pages/InboxPage";
import HelpPage from "./pages/HelpPage";
import AdminDashboard from "./pages/AdminDashboard";
import ServerDashboard from "./pages/ServerDashboard";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1350);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="app-splash-screen">
        <div className="app-splash-brand">
          <div className="app-splash-logo">
            <MessageCircle size={58} />
          </div>
          <h1>Icord</h1>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DiscordApp />
          </PrivateRoute>
        }
      />

      <Route
        path="/friends"
        element={
          <PrivateRoute>
            <FriendsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dm/:friendId"
        element={
          <PrivateRoute>
            <DirectMessagesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/pinned"
        element={
          <PrivateRoute>
            <PinnedPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/members"
        element={
          <PrivateRoute>
            <MembersPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/inbox"
        element={
          <PrivateRoute>
            <InboxPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/help"
        element={
          <PrivateRoute>
            <HelpPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard/:serverId"
        element={
          <PrivateRoute>
            <ServerDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
