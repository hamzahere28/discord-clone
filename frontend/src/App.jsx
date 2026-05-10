import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/authContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DiscordApp from "./pages/Discordapp";

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DiscordApp />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}