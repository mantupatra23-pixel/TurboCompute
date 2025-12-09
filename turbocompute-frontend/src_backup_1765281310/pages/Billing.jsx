// src/pages/Billing.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, Divider, CircularProgress, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton, Snackbar, Alert, Grid, Table,
  TableHead, TableRow, TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import { format } from "date-fns";
import InvoiceView from "../components/InvoiceView";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";

export default function Billing() {
  const token = localStorage.getItem("tc_token");
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const [wRes, tRes, iRes] = await Promise.all([
        fetch(`${BACKEND}/api/payments/wallet`, { headers: { Authorization: "Bearer " + token } }),
        fetch(`${BACKEND}/api/payments/transactions`, { headers: { Authorization: "Bearer " + token } }),
        fetch(`${BACKEND}/api/billing/invoices`, { headers: { Authorization: "Bearer " + token } }),
      ]);

      if (wRes.ok) {
        const wj = await wRes.json();
        setBalance(wj.balance ?? 0);
      } else setBalance(0);

      if (tRes.ok) {
        const tj = await tRes.json();
        setTransactions(tj || []);
      } else setTransactions([]);

      if (iRes.ok) {
        const ij = await iRes.json();
        setInvoices(ij || []);
      } else setInvoices([]);
    } catch (err) {
      setMsg({ severity: "error", text: "Cannot fetch billing data: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  function prettyAmt(paise) {
    return "₹" + ((paise || 0) / 100).toFixed(2);
  }

  const handleViewInvoice = async (invId) => {
    try {
      const res = await fetch(`${BACKEND}/api/billing/invoices/${invId}`, {
        headers: { Authorization: "Bearer " + token }
      });
      if (!res.ok) throw new Error("Invoice fetch failed");
      const j = await res.json();
      setSelectedInvoice(j);
      setInvoiceDialogOpen(true);
    } catch (err) {
      setMsg({ severity: "error", text: err.message });
    }
  };

  const handleDownloadInvoice = async (invId) => {
    // try if backend provides PDF endpoint, else open InvoiceView print
    const pdfRes = await fetch(`${BACKEND}/api/billing/invoices/${invId}/pdf`, {
      headers: { Authorization: "Bearer " + token }
    }).catch(()=>null);

    if (pdfRes && pdfRes.ok) {
      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // fallback: fetch JSON and open print window using InvoiceView approach
    handleViewInvoice(invId);
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h4">Billing & Wallet</Typography>
        <IconButton onClick={refresh}><RefreshIcon /></IconButton>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">Wallet Balance</Typography>
            <Typography variant="h5" sx={{ mb: 1 }}>{prettyAmt(balance)}</Typography>
            <Button variant="contained" href="/wallet">Add Funds</Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Your wallet is used to pay for instance hours and other services.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">Recent Transactions</Typography>

            {transactions.length === 0 ? (
              <Typography color="text.secondary">No recent transactions</Typography>
            ) : (
              <List dense>
                {transactions.slice(0,6).map(t => (
                  <ListItem key={t.id || t.txn_id} divider>
                    <ListItemText primary={`${t.type?.toUpperCase() || ""} • ${prettyAmt(t.amount)}`} secondary={`${t.status || ""} — ${t.created_at ? format(new Date(t.created_at), "dd MMM yyyy, hh:mm a") : ""}`} />
                    <ListItemSecondaryAction>
                      <Typography variant="caption">{t.ref || ""}</Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6">Invoices</Typography>
              <Box>
                <Button variant="outlined" href="/billing/export">Export</Button>
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            {invoices.length === 0 ? (
              <Typography color="text.secondary">No invoices yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoice_no || inv.id}</TableCell>
                      <TableCell>{inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy") : ""}</TableCell>
                      <TableCell>
                        <Chip label={inv.status || "unknown"} color={inv.status === "paid" ? "success" : inv.status === "overdue" ? "error" : "default"} size="small" />
                      </TableCell>
                      <TableCell>{prettyAmt(inv.amount)}</TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={()=>handleViewInvoice(inv.id)}>View</Button>
                        <Button size="small" startIcon={<DownloadIcon />} onClick={()=>handleDownloadInvoice(inv.id)}>Download</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">All Transactions</Typography>
            <Divider sx={{ my: 1 }} />
            {transactions.length === 0 ? (
              <Typography color="text.secondary">No transactions</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id || t.txn_id}>
                      <TableCell>{t.id || t.txn_id}</TableCell>
                      <TableCell>{t.type}</TableCell>
                      <TableCell>{prettyAmt(t.amount)}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell>{t.created_at ? format(new Date(t.created_at), "dd MMM yyyy, hh:mm a") : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!msg} autoHideDuration={6000} onClose={()=>setMsg(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}
      </Snackbar>

      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Invoice</DialogTitle>
        <DialogContent>
          {selectedInvoice ? <InvoiceView invoice={selectedInvoice} onClose={() => setInvoiceDialogOpen(false)} /> : <CircularProgress />}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
