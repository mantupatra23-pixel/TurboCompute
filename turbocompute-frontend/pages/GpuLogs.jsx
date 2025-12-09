// src/pages/GpuLogs.jsx
import React, { useEffect, useRef, useState } from "react";

export default function GpuLogs(){
  const [lines, setLines] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const url = (process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/logs");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("ws open");
    };
    ws.onmessage = (ev) => {
      setLines(prev => [...prev.slice(-200), ev.data]); // keep last 200 lines
    };
    ws.onclose = () => console.log("ws closed");
    ws.onerror = (e) => console.error("ws err", e);

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{fontFamily:'monospace', background:'#0b1220', color:'#d1e3ff', padding:16, borderRadius:6}}>
      <h3>GPU Logs (live)</h3>
      <div style={{height:400, overflow:'auto', border:'1px solid rgba(255,255,255,0.03)', padding:12}}>
        {lines.map((l,i) => <div key={i} style={{whiteSpace:'pre-wrap'}}>{l}</div>)}
      </div>
    </div>
  );
}
