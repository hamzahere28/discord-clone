import { createContext, useContext, useEffect, useState } from "react";
import API from "../api";
import socket from "../socket";

const AuthContext = createContext({
  user: null,
  loading: false,
  login: async () => {},
  register: async () => {},
  updateProfile: async () => {},
  updateAvatar: async () => {},
  logout: () => {}
});

const getStoredUser = () => {
  const saved = localStorage.getItem("discord_user");

  if (!saved || saved === "undefined") {
    localStorage.removeItem("discord_user");
    return null;
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem("discord_user");
    return null;
  }
};

const stripToken = (userData) => {
  if (!userData) return null;

  const { token, ...userWithoutToken } = userData;
  return userWithoutToken;
};

const normalizeAuthPayload = (data) => {
  const token = data?.token;
  const user = data?.user || (data?._id ? data : null);
  const cleanUser = stripToken(user);

  if (!token || !cleanUser?._id) {
    throw new Error("Invalid authentication response");
  }

  return {
    token,
    user: cleanUser
  };
};

const saveUser = (userData) => {
  const cleanUser = stripToken(userData);

  if (!cleanUser?._id) {
    localStorage.removeItem("discord_user");
    return null;
  }

  localStorage.setItem("discord_user", JSON.stringify(cleanUser));
  return cleanUser;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(false);

  const saveAuth = (data) => {
    const auth = normalizeAuthPayload(data);

    localStorage.setItem("discord_token", auth.token);
    saveUser(auth.user);
    setUser(auth.user);
    socket.connect();
    socket.emit("user-online", auth.user._id);
  };

  const login = async (email, password) => {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", {
        email,
        password
      });

      saveAuth(data);
      return data.user || data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/register", {
        username,
        email,
        password
      });

      saveAuth(data);
      return data.user || data;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    const { data } = await API.put("/auth/profile", profileData);
    const cleanUser = saveUser(data);

    setUser(cleanUser);

    return cleanUser;
  };

  const updateAvatar = async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const { data } = await API.put("/auth/profile/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    const cleanUser = saveUser(data);

    setUser(cleanUser);

    return cleanUser;
  };

  const logout = () => {
    localStorage.removeItem("discord_token");
    localStorage.removeItem("discord_user");
    socket.disconnect();
    setUser(null);
  };

  useEffect(() => {
    if (user?._id) {
      socket.connect();
      socket.emit("user-online", user._id);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        updateProfile,
        updateAvatar,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
