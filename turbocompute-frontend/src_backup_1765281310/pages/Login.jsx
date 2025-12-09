// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveToken } from "../utils/auth";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    if (!email || !password) {
      setError("Please enter email and password.");
      return false;
    }
    // basic email check
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.detail || "Invalid credentials or server error.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      // backend should return { access_token: "...", token_type: "bearer" }
      if (data.access_token) {
        saveToken(data.access_token);
        // redirect to dashboard
        navigate("/dashboard");
      } else {
        setError("No token returned from server.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Check backend URL and CORS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={{ margin: 0 }}>Login</h1>
        <p style={{ color: "#666", marginTop: 6 }}>Sign in to your TurboCompute account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 12, fontSize: 13, color: "#666" }}>
          Don't have an account? <a href="/register">Register</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f8fa" },
  card: { width: 360, padding: 24, borderRadius: 8, boxShadow: "0 6px 24px rgba(33,33,33,0.08)", background: "#fff" },
  form: { display: "flex", flexDirection: "column", marginTop: 12 },
  input: {
    height: 44,
    marginBottom: 12,
    padding: "0 12px",
    fontSize: 15,
    borderRadius: 6,
    border: "1px solid #e6e6e6",
  },
  button: {
    height: 44,
    borderRadius: 6,
    border: "none",
    background: "#0b74de",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { color: "#b00020", marginBottom: 8 },
};
