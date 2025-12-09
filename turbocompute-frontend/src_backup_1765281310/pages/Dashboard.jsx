// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Grid, Paper, Typography, Card, CardContent, Button, Divider,
  LinearProgress, Avatar, Chip, Table, TableHead, TableRow, TableCell,
  TableBody, CircularProgress, TextField, Select, MenuItem, FormControl,
  InputLabel, Stack, IconButton, Tooltip
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import UsageChart from "../components/UsageChart";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "https://turbocompute.onrender.com";
const WS_URL = process.env.REACT_APP_WS_URL || ""; // optional: wss://yourdomain/ws/cluster or similar

// helper - convert array of objects to CSV and trigger download
function downloadCSV(dataArray = [], filename = "export.csv") {
  if (!dataArray || !dataArray.length) {
    alert("No data to export");
    return;
  }
  const keys = Object.keys(dataArray[0]);
  const lines = [
    keys.join(","), // header
    ...dataArray.map(row =>
      keys.map(k => {
        let v = row[k] ?? "";
        // escape quotes and commas
        v = String(v).replace(/"/g, '""');
        return `"${v}"`;
      }).join(",")
    )
  ];
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const token = localStorage.getItem("tc_token");

  // filters & pagination
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // ws and fallback polling
  const wsRef = useRef(null);
  const reconnectRef = useRef(0);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/billing/summary`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("no summary");
      const j = await res.json();
      setSummary(j);
    } catch (err) {
      setSummary({
        active_instances: 6,
        gpu_hours_today: "98h",
        revenue_month: "₹68,400",
        queue: 3,
      });
    }
  }, [token]);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/instances`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("no instances");
      const j = await res.json();
      setInstances(j.instances || j || []);
    } catch (err) {
      // fallback mock
      setInstances([
        { id: "gpu-54", type: "A100 40GB", status: "running", gpu: "A100", cpu: "16", ram: "128GB", usage: 78 },
        { id: "gpu-23", type: "T4 16GB", status: "stopped", gpu: "T4", cpu: "8", ram: "64GB", usage: 0 },
        { id: "gpu-01", type: "RTX6000", status: "running", gpu: "RTX6000", cpu: "24", ram: "256GB", usage: 52 },
      ]);
    }
  }, [token]);

  const fetchChart = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/cluster/usage`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("no chart");
      const j = await res.json();
      setChartData(j.data || j || []);
    } catch (err) {
      // mock timeseries
      const now = Date.now();
      const mock = Array.from({ length: 12 }).map((_, i) => {
        const t = new Date(now - (11 - i) * 5 * 60 * 1000);
        const ts = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
        return { ts, cpu: Math.round(Math.random() * 60), gpu: Math.round(Math.random() * 90), mem: Math.round(Math.random() * 80) };
      });
      setChartData(mock);
    }
  }, [token]);

  // unified refresh
  const refreshAll = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchInstances(), fetchChart()]).finally(() => setLoading(false));
  }, [fetchSummary, fetchInstances, fetchChart]);

  useEffect(() => {
    refreshAll();

    // WebSocket setup if WS_URL provided
    if (!WS_URL) {
      // fallback polling every 30s
      const poll = setInterval(() => {
        fetchChart();
        fetchInstances();
      }, 30000);
      return () => clearInterval(poll);
    }

    function connectWS() {
      try {
        wsRef.current = new WebSocket(WS_URL + (WS_URL.includes("?") ? "&" : "?") + `token=${token}`);
      } catch (e) {
        console.warn("WS connect failed", e);
        return;
      }

      wsRef.current.onopen = () => {
        reconnectRef.current = 0;
        console.log("WS connected");
      };

      wsRef.current.onmessage = (evt) => {
        // expecting JSON messages like:
        // { type: 'metrics', data: [{ts, cpu, gpu, mem}, ...] }
        // or { type: 'instance_update', data: {...instance...} }
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "metrics") {
            setChartData(msg.data || []);
          } else if (msg.type === "instance_update") {
            const u = msg.data;
            setInstances(prev => {
              const idx = prev.findIndex(p => p.id === u.id);
              if (idx === -1) return [u, ...prev];
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...u };
              return copy;
            });
          } else if (msg.type === "bulk_instances") {
            setInstances(msg.data || []);
          }
        } catch (e) {
          console.warn("WS message parse error", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WS closed");
        // try reconnect with backoff
        reconnectRef.current = (reconnectRef.current || 0) + 1;
        const timeout = Math.min(30000, 1000 * reconnectRef.current);
        setTimeout(connectWS, timeout);
      };

      wsRef.current.onerror = (e) => {
        console.warn("WS error", e);
        wsRef.current.close();
      };
    }

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
    // eslint-disable-next-line
  }, [refreshAll, fetchChart, fetchInstances]);

  // FILTERS + PAGINATION logic
  const filtered = instances.filter((ins) => {
    if (statusFilter !== "all" && ins.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (ins.id && ins.id.toLowerCase().includes(s)) ||
      (ins.type && ins.type.toLowerCase().includes(s)) ||
      (ins.gpu && ins.gpu.toLowerCase().includes(s));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages]); // reset if out of range

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  // quick CSV helper for instances
  const exportInstances = () => {
    const rows = filtered.map(i => ({
      id: i.id,
      type: i.type || i.plan_code || i.gpu_name,
      status: i.status,
      cpu: i.cpu,
      ram: i.ram,
      usage: i.usage ?? 0,
      price_per_hour: i.price_per_hour ?? i.hourly_price ?? "",
    }));
    downloadCSV(rows, `instances_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`);
  };

  if (loading || !summary) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const summaryCards = [
    { title: "Active Instances", value: summary.active_instances ?? 0, },
    { title: "GPU Hours (today)", value: summary.gpu_hours_today ?? "0h", },
    { title: "Revenue (month)", value: summary.revenue_month ?? "₹0", },
    { title: "Queue length", value: summary.queue ?? 0, },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={refreshAll}><RefreshIcon /></IconButton>
          </Tooltip>

          <Tooltip title="Export visible / filtered instances (CSV)">
            <IconButton onClick={exportInstances}><FileDownloadIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Grid container spacing={2}>
        {summaryCards.map((s, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card elevation={3} sx={{ background: "transparent" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>{String(s.title)[0]}</Avatar>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">{s.title}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{s.value}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Cluster usage (last samples)</Typography>
              <Button variant="contained" size="small" onClick={fetchChart}>Refresh Chart</Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <UsageChart data={chartData} type="area" dataKey="gpu" color="#90caf9" />

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Average GPU</Typography>
                <Typography variant="h6"> {Math.round(chartData.reduce((a,c)=>a+(c.gpu||0),0) / Math.max(1, chartData.length))}%</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Average CPU</Typography>
                <Typography variant="h6"> {Math.round(chartData.reduce((a,c)=>a+(c.cpu||0),0) / Math.max(1, chartData.length))}%</Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
              <TextField placeholder="Search by id/type/gpu" size="small" value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} sx={{ width: 260 }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={statusFilter} onChange={(e)=>{ setStatusFilter(e.target.value); setPage(1); }}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="stopped">Stopped</MenuItem>
                  <MenuItem value="provisioning">Provisioning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
                <Typography variant="caption">Page</Typography>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select value={page} onChange={(e)=>setPage(Number(e.target.value))}>
                    {Array.from({length: totalPages}).map((_,i)=> <MenuItem key={i} value={i+1}>{i+1}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
                    <MenuItem value={5}>5 / page</MenuItem>
                    <MenuItem value={8}>8 / page</MenuItem>
                    <MenuItem value={12}>12 / page</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Instance</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>CPU</TableCell>
                  <TableCell>RAM</TableCell>
                  <TableCell>GPU Usage</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((ins) => (
                  <TableRow key={ins.id}>
                    <TableCell>{ins.id}</TableCell>
                    <TableCell>{ins.type || ins.plan_code || ins.gpu_name}</TableCell>
                    <TableCell>
                      <Chip label={ins.status} color={ins.status === "running" ? "success" : ins.status === "error" ? "error" : "default"} size="small" />
                    </TableCell>
                    <TableCell>{ins.cpu}</TableCell>
                    <TableCell>{ins.ram}</TableCell>
                    <TableCell sx={{ width: 220 }}>
                      <Typography variant="caption" color="text.secondary">{ins.usage ?? 0}%</Typography>
                      <LinearProgress variant="determinate" value={ins.usage ?? 0} sx={{ height: 8, borderRadius: 2, mt: 0.5 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="outlined" sx={{ mr: 1 }} href={`/instances/${ins.id}`}>Open</Button>
                      <Button size="small" variant="contained">Start</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* pagination footer */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Showing {Math.min(filtered.length, page*pageSize)} of {filtered.length} results</Typography>
              <Box>
                <Button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
                <Button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Quick Actions</Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained">Create GPU</Button>
              <Button variant="outlined">Buy Credits</Button>
              <Button variant="outlined">Manage Keys</Button>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.secondary">Billing</Typography>
            <Typography variant="h6" sx={{ mb: 1 }}>{summary.revenue_month ?? "₹0"}</Typography>
            <Button fullWidth variant="contained">Pay Now</Button>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Activity</Typography>
            <Divider sx={{ my: 1 }} />
            <Box>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 36, height: 36 }}>A</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>gpu-54</Typography>
                  <Typography variant="caption" color="text.secondary">Created 5 mins ago</Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 36, height: 36 }}>S</Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Payment success</Typography>
                  <Typography variant="caption" color="text.secondary">₹1,000 received</Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
