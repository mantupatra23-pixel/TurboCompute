// src/components/GpuLogs.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  IconButton,
  Button,
  TextField,
  Typography,
  Switch,
  Tooltip,
  Divider,
  Stack,
} from "@mui/material";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import GetAppIcon from "@mui/icons-material/GetApp";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import WifiIcon from "@mui/icons-material/Wifi";

const DEFAULT_MAX_LINES = 5000; // memory cap

export default function GpuLogs({
  wsUrl, // e.g. wss://your-backend.example/ws/logs/<instanceId>
  instanceId,
  maxLines = DEFAULT_MAX_LINES,
}) {
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [lines, setLines] = useState([]); // array of {id, text, ts}
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const bufferRef = useRef([]); // when paused we buffer incoming lines
  const reconnectAttempt = useRef(0);
  const backoffTimeout = useRef(null);
  const nextId = useRef(1);

  const connect = useCallback(() => {
    if (!wsUrl) return;
    // create socket
    try {
      socketRef.current = new WebSocket(wsUrl);
    } catch (err) {
      console.error("WebSocket create failed:", err);
      scheduleReconnect();
      return;
    }

    socketRef.current.onopen = () => {
      reconnectAttempt.current = 0;
      setConnected(true);
      // optionally send a handshake including instanceId
      if (instanceId) {
        try {
          socketRef.current.send(JSON.stringify({ type: "subscribe", id: instanceId }));
        } catch {}
      }
    };

    socketRef.current.onmessage = (evt) => {
      // assume server sends plain text lines OR JSON {line: "..."}
      let text = "";
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed.line) text = String(parsed.line);
        else text = String(evt.data);
      } catch {
        text = String(evt.data);
      }

      const entry = { id: nextId.current++, text, ts: Date.now() };

      if (paused) {
        bufferRef.current.push(entry);
      } else {
        setLines((prev) => {
          const arr = prev.concat(entry);
          if (arr.length > maxLines) {
            // drop older
            return arr.slice(arr.length - maxLines);
          }
          return arr;
        });
      }
    };

    socketRef.current.onclose = () => {
      setConnected(false);
      scheduleReconnect();
    };

    socketRef.current.onerror = (err) => {
      console.error("WebSocket error", err);
      // close will trigger reconnect
      try { socketRef.current.close(); } catch {}
    };
  }, [wsUrl, instanceId, paused, maxLines]);

  const scheduleReconnect = () => {
    if (backoffTimeout.current) return;
    reconnectAttempt.current += 1;
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(6, reconnectAttempt.current)));
    backoffTimeout.current = setTimeout(() => {
      backoffTimeout.current = null;
      connect();
    }, delay);
  };

  // initial connect
  useEffect(() => {
    connect();
    return () => {
      if (backoffTimeout.current) clearTimeout(backoffTimeout.current);
      try { socketRef.current && socketRef.current.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsUrl, instanceId]);

  // flush buffer when unpaused
  useEffect(() => {
    if (!paused && bufferRef.current.length) {
      setLines((prev) => {
        const arr = prev.concat(bufferRef.current);
        bufferRef.current = [];
        if (arr.length > maxLines) return arr.slice(arr.length - maxLines);
        return arr;
      });
    }
  }, [paused, maxLines]);

  // auto-scroll on new lines
  useEffect(() => {
    if (!autoScroll || paused) return;
    const el = containerRef.current;
    if (!el) return;
    // small delay to let DOM update
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 20);
  }, [lines, autoScroll, paused]);

  // controls
  const togglePause = () => setPaused((p) => !p);
  const clearAll = () => {
    bufferRef.current = [];
    setLines([]);
  };
  const downloadLogs = () => {
    const text = lines.map((l) => `[${new Date(l.ts).toISOString()}] ${l.text}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gpu-logs-${instanceId || "all"}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filteredLines = lines.filter((l) => {
    if (filterText && !l.text.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  const highlight = (text) => {
    if (!searchText) return text;
    const low = text.toLowerCase();
    const q = searchText.toLowerCase();
    const idx = low.indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: "rgba(255,210,0,0.6)" }}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const manualReconnect = () => {
    try {
      socketRef.current && socketRef.current.close();
    } catch {}
    reconnectAttempt.current = 0;
    connect();
  };

  return (
    <Paper sx={{ p: 1, display: "flex", flexDirection: "column", height: "100%" }} elevation={1}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6">GPU Logs {instanceId ? `— ${instanceId}` : ""}</Typography>
          <Typography variant="caption" color={connected ? "green" : "text.secondary"}>
            {connected ? <><WifiIcon fontSize="small" /> Live</> : <><WifiOffIcon fontSize="small" /> Disconnected</>}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Filter (show only lines containing...)"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{ width: 320 }}
          />
          <TextField
            size="small"
            placeholder="Search highlight"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{ width: 200 }}
          />

          <Tooltip title={paused ? "Resume" : "Pause"}>
            <IconButton onClick={togglePause} color={paused ? "warning" : "primary"}>
              {paused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Clear">
            <IconButton onClick={clearAll}>
              <ClearAllIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download logs">
            <IconButton onClick={downloadLogs}>
              <GetAppIcon />
            </IconButton>
          </Tooltip>

          <Button variant="outlined" size="small" onClick={manualReconnect}>
            Reconnect
          </Button>

          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 1 }}>
            <Typography variant="body2">Auto-scroll</Typography>
            <Switch checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          </Stack>
        </Stack>
      </Stack>

      <Divider />

      <Box
        ref={containerRef}
        sx={{
          mt: 1,
          height: "calc(100vh - 240px)",
          overflow: "auto",
          backgroundColor: "rgba(0,0,0,0.9)",
          color: "#e6e6e6",
          fontFamily: "monospace",
          fontSize: 13,
          p: 1,
          borderRadius: 1,
        }}
      >
        {filteredLines.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No logs yet.
          </Typography>
        ) : (
          filteredLines.map((l, idx) => (
            <div key={l.id} style={{ whiteSpace: "pre-wrap", lineHeight: "1.35", padding: "2px 0" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", marginRight: 8 }}>
                {String(idx + 1).padStart(4, "0")}
              </span>
              <span style={{ color: "rgba(150,150,150,0.9)", marginRight: 10 }}>
                [{new Date(l.ts).toLocaleTimeString()}]
              </span>
              <span>{highlight(l.text)}</span>
            </div>
          ))
        )}
      </Box>
    </Paper>
  );
}
