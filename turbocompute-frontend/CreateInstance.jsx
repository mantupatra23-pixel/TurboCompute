// src/pages/CreateInstance.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

const BACKEND =
  process.env.REACT_APP_BACKEND_URL ||
  "https://turbocompute.onrender.com";

export default function CreateInstance() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [hours, setHours] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const plans = [
    { code: "A10", gpu: "NVIDIA A10", price: 35 },
    { code: "A100", gpu: "NVIDIA A100 40GB", price: 140 },
    { code: "RTX4090", gpu: "RTX 4090", price: 55 },
  ];

  const handleLaunchClick = (plan) => {
    setSelectedPlan(plan);
    setConfirmOpen(true);
  };

  // ---------- CREATE INSTANCE ----------
  const createInstance = async () => {
    setConfirmOpen(false);
    setCreating(true);
    setError("");

    try {
      const payload = {
        plan_code: selectedPlan.code,
        hours: Number(hours),
      };

      const res = await fetch(`${BACKEND}/api/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + localStorage.getItem("tc_token"),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Instance create failed.");
      }

      const data = await res.json();

      const newId = data.id || data.instance_id;
      if (newId) {
        window.location.href = `/instances/${newId}`; // 🚀 Auto redirect
      } else {
        throw new Error("Instance ID not returned.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Launch New GPU Instance
      </Typography>

      {error && (
        <Typography color="red" sx={{ mb: 2 }}>
          ❌ {error}
        </Typography>
      )}

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        {plans.map((p) => (
          <Card
            key={p.code}
            sx={{ width: 260, cursor: "pointer" }}
            onClick={() => handleLaunchClick(p)}
          >
            <CardContent>
              <Typography variant="h6">{p.gpu}</Typography>
              <Typography color="text.secondary">
                ₹{p.price}/hour
              </Typography>
              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 1 }}
              >
                Launch
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Hours Input */}
      {selectedPlan && (
        <Box sx={{ mt: 3 }}>
          <TextField
            type="number"
            label="Hours"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            sx={{ width: 200 }}
          />
        </Box>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Launch</DialogTitle>
        <DialogContent>
          <Typography>
            GPU: <b>{selectedPlan?.gpu}</b>
          </Typography>
          <Typography>
            Hours: <b>{hours}</b>
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Total Cost:{" "}
            <b>₹{(selectedPlan?.price || 0) * hours}</b>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createInstance}
            disabled={creating}
          >
            {creating ? "Launching…" : "Launch"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
