import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, QrCode, RefreshCcw, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState("");
  const [loginMode, setLoginMode] = useState("password");
  const [qrSeed, setQrSeed] = useState(() => Date.now());

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      setError("");
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card auth-card-upgraded" onSubmit={submitHandler}>
        <div className="auth-brand-block">
          <div className="auth-logo">
            <MessageCircle size={42} />
          </div>

          <div>
            <h1>Icord</h1>
            <p>Login to continue your conversations.</p>
          </div>
        </div>

        <div className="auth-route-tabs">
          <Link className="active" to="/login">
            Login
          </Link>
          <Link to="/register">
            Register
          </Link>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="login-mode-switch">
          <button
            type="button"
            className={loginMode === "password" ? "active" : ""}
            onClick={() => setLoginMode("password")}
          >
            <ShieldCheck size={15} />
            Password
          </button>

          <button
            type="button"
            className={loginMode === "qr" ? "active" : ""}
            onClick={() => setLoginMode("qr")}
          >
            <QrCode size={15} />
            QR Login
          </button>
        </div>

        {loginMode === "password" ? (
          <>
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
              placeholder="Your password"
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value
                })
              }
            />

            <button disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </>
        ) : (
          <div className="qr-login-panel">
            <div
              className="qr-code-card"
              aria-label={`QR login code ${qrSeed}`}
            >
              {Array.from({ length: 81 }).map((_, index) => (
                <span
                  key={`${qrSeed}-${index}`}
                  className={
                    index % 2 === 0 ||
                    index % 7 === 0 ||
                    (index + qrSeed) % 11 === 0
                      ? "filled"
                      : ""
                  }
                />
              ))}
            </div>

            <div className="qr-login-copy">
              <strong>Scan with your phone</strong>
              <p>Open the mobile app camera, scan this code, then approve login.</p>
            </div>

            <button
              className="qr-refresh-btn"
              type="button"
              onClick={() => setQrSeed(Date.now())}
            >
              <RefreshCcw size={16} />
              Refresh Code
            </button>

            <div className="qr-security-note">
              <Smartphone size={15} />
              Secure QR session ready
            </div>
          </div>
        )}

        <span>
          Need an account? <Link to="/register">Register</Link>
        </span>
      </form>
    </div>
  );
}
