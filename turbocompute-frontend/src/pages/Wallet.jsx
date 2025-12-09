import React, { useState, useEffect } from "react";
import { getWallet, createOrder } from "../api";
import { getToken } from "../Auth";
import { Typography, Button, Box } from "@mui/material";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);

  async function load() {
    try {
      const data = await getWallet(getToken());
      setWallet(data);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(()=>{ load(); }, []);

  async function onTopup() {
    try {
      const amount = parseFloat(prompt("Enter amount (INR)")) || 0;
      if (!amount) return;
      const data = await createOrder({ amount }, getToken());
      // backend returns order detail; in real app redirect to payment gateway
      alert("Created order: " + JSON.stringify(data.order || data));
      load();
    } catch (e) {
      alert(e.message || "Error");
    }
  }

  return (
    <Box>
      <Typography variant="h4">Wallet</Typography>
      <Typography>Balance: {wallet?.balance ?? "—"}</Typography>
      <Button variant="contained" sx={{ mt: 2 }} onClick={onTopup}>Topup</Button>
    </Box>
  );
}
