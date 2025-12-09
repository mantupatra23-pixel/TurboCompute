// src/pages/CreateInstance.jsx
import React, { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PlanCard from "../components/PlanCard";
import ConfirmDialog from "../components/ConfirmDialog";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";

const PLANS = [
  { code: "cpu-basic", title: "Basic CPU", desc: "2 vCPU • 4 GB RAM", price_per_hour: 10 },
  { code: "gpu-t4", title: "GPU T4", desc: "4 vCPU • 16 GB RAM • 1 x T4", price_per_hour: 50 },
  { code: "gpu-a100", title: "GPU A100", desc: "8 vCPU • 64 GB RAM • 1 x A100", price_per_hour: 300 },
];

export default function CreateInstance() {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [hours, setHours] = useState(1);
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createdId, setCreatedId] = useState(null);

  useEffect(() => {
    fetchWallet();
  }, []);

  async function fetchWallet() {
    try {
      setLoadingWallet(true);
      const res = await fetch(`${BACKEND}/api/billing/wallet`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("tc_token") }
      });
      if (!res.ok) {
        setWallet(null);
        return;
      }
      const data = await res.json();
      // assume backend returns { balance: 120.5 }
      setWallet(data.balance ?? 0);
    } catch (e) {
      console.error(e);
      setWallet(null);
    } finally {
      setLoadingWallet(false);
    }
  }

  const estimated = (selectedPlan.price_per_hour || 0) * Math.max(1, Number(hours || 1));

  const handleLaunch = () => {
    setError("");
    // check wallet
    if (wallet === null) {
      setError("Wallet balance unavailable. Refresh and try again.");
      return;
    }
    if (wallet < estimated) {
      setError("Wallet balance insufficient. Please recharge first.");
      return;
    }
    setConfirmOpen(true);
  };

  const doCreate = async () => {
    setConfirmOpen(false);
    setCreating(true);
    try {
      const payload = {
        plan_code: selectedPlan.code,
        hours: Number(hours)
      };
      const res = await fetch(`${BACKEND}/api/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("tc_token")
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Server error while creating instance");
      }
      const data = await res.json();
      // assume response contains created instance id
      setCreatedId(data.id || data.instance_id || null);
      // refresh wallet & instances (caller page can refresh)
      await fetchWallet();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create instance");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create Instance
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Choose plan, hours and launch your GPU/CPU instance. You will be charged estimated amount upfront.
      </Typography>

      <Grid container spacing={2}>
        {PLANS.map((p) => (
          <Grid item xs={12} md={4} key={p.code}>
            <PlanCard
              plan={p}
              selected={selectedPlan.code === p.code}
              onSelect={() => setSelectedPlan(p)}
            />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ maxWidth: 420 }}>
        <TextField
          label="Hours"
          type="number"
          inputProps={{ min: 1 }}
          value={hours}
          onChange={(e) => setHours(Math.max(1, Number(e.target.value || 1)))}
          sx={{ mb: 2, width: 200 }}
        />

        <Box sx={{ my: 1 }}>
          <Typography variant="subtitle2">Estimated cost</Typography>
          <Typography variant="h6">₹ {estimated.toFixed(2)}</Typography>
        </Box>

        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle2">Wallet balance</Typography>
          {loadingWallet ? (
            <CircularProgress size={18} />
          ) : (
            <Typography>
              ₹ {Number(wallet || 0).toFixed(2)}{" "}
              {wallet < estimated && <strong style={{ color: "#d32f2f" }}> (Insufficient)</strong>}
            </Typography>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <Button variant="contained" color="primary" onClick={handleLaunch} disabled={creating || loadingWallet}>
            {creating ? "Creating..." : "Launch Instance"}
          </Button>

          <Button variant="outlined" color="secondary" href="/wallet">
            Recharge Wallet
          </Button>
        </Box>

        {createdId && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Instance created (id: {createdId}). Check <a href={`/instances/${createdId}`}>details</a>.
          </Alert>
        )}
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm launch"
        content={`Launch ${selectedPlan.title} for ${hours} hour(s) — Estimated ₹${estimated.toFixed(2)}?`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doCreate}
      />
    </Box>
  );
}
