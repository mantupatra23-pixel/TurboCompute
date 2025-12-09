// src/components/InstanceDetails.jsx
import React, { useEffect, useState } from "react";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";

export default function InstanceDetails({ open, onClose, instance }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMetrics() {
    try {
      const res = await fetch(`${BACKEND}/api/instances/${instance.id}/metrics`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("tc_token") },
      });
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      loadMetrics();
    }
  }, [open]);

  const action = async (cmd) => {
    await fetch(`${BACKEND}/api/instances/${instance.id}/${cmd}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + localStorage.getItem("tc_token") },
    });
    alert("Action sent: " + cmd);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div style={{ width: 380, padding: 20 }}>
        <Typography variant="h5">{instance.name}</Typography>
        <Typography variant="body2" sx={{ color: "gray" }}>
          {instance.gpu_type} — {instance.region}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Button variant="contained" color="success" fullWidth sx={{ mb: 1 }} onClick={() => action("start")}>
          Start
        </Button>
        <Button variant="contained" color="warning" fullWidth sx={{ mb: 1 }} onClick={() => action("stop")}>
          Stop
        </Button>
        <Button variant="contained" color="error" fullWidth sx={{ mb: 1 }} onClick={() => action("delete")}>
          Delete
        </Button>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6">Live Metrics</Typography>

        {loading && <CircularProgress sx={{ mt: 2 }} />}

        {metrics && (
          <div style={{ marginTop: 10 }}>
            <p>CPU: {metrics.cpu_pct}%</p>
            <p>GPU: {metrics.gpu_pct}%</p>
            <p>GPU Memory: {metrics.gpu_mem_pct}%</p>
            <p>RAM: {metrics.ram_pct}%</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
