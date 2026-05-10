import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../context/authContext";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });

  const [error, setError] = useState("");

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      setError("");

      await register(
        form.username,
        form.email,
        form.password
      );

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Registration failed"
   
      );
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submitHandler}>
        <div className="auth-logo">
          <MessageCircle size={42} />
        </div>

        <h1>Create account</h1>
        <p>Start chatting with communities.</p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <label>Username</label>

        <input
          type="text"
          placeholder="Your username"
          value={form.username}
          onChange={(e) =>
            setForm({
              ...form,
              username: e.target.value
            })
          }
        />

        <label>Email</label>

        <input
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value
            })
          }
        />

        <label>Password</label>

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value
            })
          }
        />

        <button disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>

        <span>
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </span>
      </form>
    </div>
  );
}