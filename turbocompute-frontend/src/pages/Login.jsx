import React, { useState } from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import { login } from "../api";
import { saveToken } from "../Auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const data = await login({ email, password });
      if (data?.token) {
        saveToken(data.token);
        navigate("/dashboard");
      } else {
        setErr("Login failed");
      }
    } catch (e) {
      setErr(e.message || "Error");
    }
  }

  return (
    <Box sx={{ maxWidth: 420 }}>
      <Typography variant="h5">Login</Typography>
      <form onSubmit={onSubmit}>
        <TextField fullWidth label="Email" margin="normal" value={email} onChange={e=>setEmail(e.target.value)} />
        <TextField fullWidth label="Password" margin="normal" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <Typography color="error">{err}</Typography>}
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>Login</Button>
      </form>
    </Box>
  );
}
