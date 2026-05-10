import { createContext, useContext, useEffect, useState } from "react";
import API from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("discord_user")) || null
  );

  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);

    const { data } = await API.post("/auth/login", {
      email,
      password
    });

    localStorage.setItem("discord_token", data.token);
    localStorage.setItem("discord_user", JSON.stringify(data.user));

    setUser(data.user);
    setLoading(false);
  };

  const register = async (username, email, password) => {
    setLoading(true);

    const { data } = await API.post("/auth/register", {
      username,
      email,
      password
    });

    localStorage.setItem("discord_token", data.token);
    localStorage.setItem("discord_user", JSON.stringify(data.user));

    setUser(data.user);
    setLoading(false);
  };

  const updateProfile = async (profileData) => {
    const { data } = await API.put("/auth/profile", profileData);

    localStorage.setItem("discord_user", JSON.stringify(data));
    setUser(data);

    return data;
  };

  const logout = () => {
    localStorage.removeItem("discord_token");
    localStorage.removeItem("discord_user");
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("discord_token");

    if (!token) {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        updateProfile,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);