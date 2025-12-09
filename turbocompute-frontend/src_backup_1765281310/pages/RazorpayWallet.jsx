// src/pages/RazorpayWallet.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";
const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY || "";

export default function RazorpayWallet() {
  const token = localStorage.getItem("tc_token");
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amountToAdd, setAmountToAdd] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!token) {
      // if you use routing, redirect
      return;
    }
    fetchWallet();
    // eslint-disable-next-line
  }, []);

  async function fetchWallet() {
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`${BACKEND}/api/payments/wallet`, {
          headers: { Authorization: "Bearer " + token },
        }),
        fetch(`${BACKEND}/api/payments/transactions`, {
          headers: { Authorization: "Bearer " + token },
        }),
      ]);
      if (res1.ok) {
        const j = await res1.json();
        setBalance(j.balance ?? 0);
      }
      if (res2.ok) {
        const t = await res2.json();
        setTransactions(t || []);
      }
    } catch (err) {
      setMsg({ severity: "error", text: "Cannot fetch wallet: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  // dynamically load Razorpay script
  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Razorpay SDK failed to load."));
      document.body.appendChild(script);
    });
  }

  async function handleAddFunds(e) {
    e?.preventDefault();
    const amount = parseFloat(amountToAdd);
    if (!amount || amount <= 0) {
      setMsg({ severity: "warning", text: "Enter valid amount" });
      return;
    }

    if (!RAZORPAY_KEY) {
      setMsg({ severity: "error", text: "RAZORPAY KEY missing. Set REACT_APP_RAZORPAY_KEY" });
      return;
    }

    try {
      setActionLoading(true);

      // 1) backend create order (amount in paise)
      const orderRes = await fetch(`${BACKEND}/api/payments/razorpay/create_order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR" }),
      });

      if (!orderRes.ok) {
        const j = await orderRes.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to create order");
      }

      const order = await orderRes.json();
      // order should include id, amount, currency, receipt etc.

      await loadRazorpayScript();

      const options = {
        key: RAZORPAY_KEY,
        amount: order.amount, // in paise
        currency: order.currency || "INR",
        name: "TurboCompute Wallet",
        description: "Add funds to wallet",
        order_id: order.id, // server generated order id
        handler: async function (response) {
          // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
          try {
            // verify payment on backend and credit wallet
            const verify = await fetch(`${BACKEND}/api/payments/razorpay/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
              body: JSON.stringify({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature,
              }),
            });

            if (!verify.ok) {
              const j = await verify.json().catch(()=>({}));
              throw new Error(j.detail || "Payment verification failed");
            }

            setMsg({ severity: "success", text: "Payment successful and wallet updated." });
            setAmountToAdd("");
            await fetchWallet();
          } catch (err) {
            setMsg({ severity: "error", text: err.message });
          }
        },
        prefill: {
          // optional: fill with user info from backend
        },
        theme: {
          color: "#1976d2",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setMsg({ severity: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWithdraw(e) {
    e?.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setMsg({ severity: "warning", text: "Enter valid withdraw amount" });
      return;
    }
    if (amount > balance) {
      setMsg({ severity: "warning", text: "Withdraw amount greater than balance" });
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${BACKEND}/api/payments/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR" }),
      });

      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j.detail || "Withdraw request failed");
      }
      setMsg({ severity: "success", text: "Withdraw request submitted." });
      setWithdrawAmount("");
      fetchWallet();
    } catch (err) {
      setMsg({ severity: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Razorpay Wallet
      </Typography>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="subtitle2">Wallet Balance</Typography>
                <Typography variant="h5">₹ { (balance/100).toFixed(2) }</Typography>
              </Box>

              <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={fetchWallet}
                  disabled={actionLoading}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Add Funds</Typography>
            <Divider sx={{ my: 1 }} />
            <Box
              component="form"
              onSubmit={handleAddFunds}
              sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
            >
              <TextField
                label="Amount (INR)"
                variant="outlined"
                value={amountToAdd}
                onChange={(e) => setAmountToAdd(e.target.value)}
                size="small"
                sx={{ width: 160 }}
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={actionLoading}
              >
                Add via Razorpay
              </Button>
              <Typography color="text.secondary" sx={{ ml: 1 }}>
                (No charges displayed here — backend handles fees)
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Withdraw</Typography>
            <Divider sx={{ my: 1 }} />
            <Box component="form" onSubmit={handleWithdraw} sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                label="Withdraw Amount (INR)"
                variant="outlined"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                size="small"
                sx={{ width: 180 }}
              />
              <Button variant="outlined" color="error" type="submit" disabled={actionLoading}>
                Request Withdraw
              </Button>
              <Typography color="text.secondary">Available: ₹{(balance/100).toFixed(2)}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Withdrawals will be processed by admin/finance. Backend should create payout or instruct manual transfer.
            </Typography>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="h6">Transactions</Typography>
              <Button size="small" onClick={fetchWallet}>Reload</Button>
            </Box>
            <Divider sx={{ my: 1 }} />
            {transactions.length === 0 ? (
              <Typography color="text.secondary">No transactions yet.</Typography>
            ) : (
              <List dense>
                {transactions.map((t) => (
                  <ListItem key={t.id || t.txn_id} divider>
                    <ListItemText
                      primary={`${t.type?.toUpperCase() || t.kind} • ₹${(t.amount/100).toFixed(2)}`}
                      secondary={`${t.status || ""} — ${t.created_at ? new Date(t.created_at).toLocaleString() : ""}`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="caption" color="text.secondary">
                        {t.ref || t.payment_id || ""}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      )}

      <Snackbar
        open={!!msg}
        autoHideDuration={6000}
        onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {msg ? (
          <Alert severity={msg.severity || "info"} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        ) : null}
      </Snackbar>
    </Box>
  );
}
