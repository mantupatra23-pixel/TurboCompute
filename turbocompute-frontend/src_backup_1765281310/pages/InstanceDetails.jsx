// src/pages/InstanceDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  TextField,
} from "@mui/material";

const BACKEND =
  process.env.REACT_APP_BACKEND_URL ||
  "https://turbocompute.onrender.com";

export default function InstanceDetails() {
  const { id } = useParams();
  const nav = useNavigate();

  const [inst, setInst] = useState(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("tc_token");

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    fetchAll();
    // poll every 10s for status update
    const t = setInterval(fetchInstance, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [id]);

  async function fetchAll() {
    setLoading(true);
    setError("");
    await Promise.all([fetchInstance(), fetchLogs()]);
    setLoading(false);
  }

  async function fetchInstance() {
    try {
      const res = await fetch(`${BACKEND}/api/instances/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || "Cannot fetch instance");
      }
      const data = await res.json();
      setInst(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch(`${BACKEND}/api/instances/${id}/logs`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) return; // logs optional
      const txt = await res.text();
      setLogs(txt);
    } catch (err) {
      // ignore logs errors
    }
  }

  async function performAction(action) {
    // actions: start, stop, terminate, reboot
    if (!window.confirm(`Are you sure to ${action} this instance?`)) return;
    setActionLoading(true);
    setError("");
    try {
      const method = action === "terminate" ? "DELETE" : "POST";
      const url =
        action === "start"
          ? `${BACKEND}/api/instances/${id}/start`
          : action === "stop"
          ? `${BACKEND}/api/instances/${id}/stop`
          : action === "reboot"
          ? `${BACKEND}/api/instances/${id}/reboot`
          : `${BACKEND}/api/instances/${id}`; // terminate (DELETE)

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      });

      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || `${action} failed`);
      }

      // refresh
      await fetchAll();
      if (action === "terminate") {
        nav("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading instance...</Typography>
      </Box>
    );
  }

  if (!inst) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Instance not found.</Typography>
        {error && <Typography color="error">{error}</Typography>}
      </Box>
    );
  }

  const costPerHour = inst.price_per_hour || inst.hourly_price || 0;
  const running = inst.status === "running" || inst.status === "active";

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Instance #{inst.id || id}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {inst.gpu_name || inst.plan_code} • {inst.region || "region N/A"}
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography>
          Status:{" "}
          <b style={{ color: running ? "green" : "orange" }}>
            {inst.status || "unknown"}
          </b>
        </Typography>
        <Typography>
          Uptime: <b>{inst.uptime || inst.running_for || "—"}</b>
        </Typography>
        <Typography>
          Cost/hr: <b>₹{costPerHour}</b>
        </Typography>
        <Typography>
          Started at: <b>{inst.started_at || "—"}</b>
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="success"
            onClick={() => performAction("start")}
            disabled={running || actionLoading}
          >
            Start
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => performAction("stop")}
            disabled={!running || actionLoading}
          >
            Stop
          </Button>
          <Button
            variant="outlined"
            color="info"
            onClick={() => performAction("reboot")}
            disabled={!running || actionLoading}
          >
            Reboot
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => performAction("terminate")}
            disabled={actionLoading}
          >
            Terminate
          </Button>

          <Button
            sx={{ ml: "auto" }}
            onClick={() => {
              // connect url from backend if exists
              if (inst.connect_url) {
                window.open(inst.connect_url, "_blank");
              } else {
                alert(
                  "No connect URL available. Use logs / IP to SSH/VNC from your side."
                );
              }
            }}
          >
            Connect
          </Button>
        </Box>
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Details
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography>IP: {inst.ip || "—"}</Typography>
        <Typography>Region: {inst.region || "—"}</Typography>
        <Typography>Type: {inst.plan_code || inst.gpu_name || "—"}</Typography>
        <Typography>Owner: {inst.owner || "—"}</Typography>
        <Typography>
          Expires at: {inst.expires_at || inst.ends_at || "—"}
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Logs
      </Typography>
      <Paper sx={{ p: 2 }}>
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={logs || "No logs available."}
          InputProps={{ readOnly: true }}
        />
        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
          <Button
            onClick={() => fetchLogs()}
            disabled={actionLoading}
          >
            Refresh Logs
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(logs || "");
              alert("Logs copied to clipboard");
            }}
          >
            Copy Logs
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
