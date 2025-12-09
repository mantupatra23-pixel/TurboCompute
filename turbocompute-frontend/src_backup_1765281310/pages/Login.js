// src/pages/Login.js
import React, { useState } from "react";
import api from "../api";
import { setToken } from "../auth/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password: pwd });
      // adjust according to backend response shape:
      // try res.data.token or res.data.access_token or res.data.data.token
      const token = res?.data?.token || res?.data?.access_token || res?.data?.data?.token;
      if (!token) throw new Error("No token in response");
      setToken(token);
      nav("/dashboard");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{padding:20}}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <br/><br/>
        <input value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Password" type="password" />
        <br/><br/>
        <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
