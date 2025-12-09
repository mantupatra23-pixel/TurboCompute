// src/components/Layout.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Avatar from "@mui/material/Avatar";

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const sidebarWidth = 260;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: open ? sidebarWidth : 72,
          transition: "width .18s",
          background: "#0f1724",
          color: "#cbd5e1",
          padding: "20px 12px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "transparent",
              border: "none",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
            aria-label="toggle"
          >
            <MenuIcon />
          </button>
          {open && <h3 style={{ margin: 0 }}>TurboCompute</h3>}
        </div>

        <nav style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <Link to="/" style={{ color: "#9CA3AF", textDecoration: "none", paddingLeft: open?8:0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>🏠</span>
              {open && <span>Home</span>}
            </div>
          </Link>

          <Link to="/dashboard" style={{ color: "#9CA3AF", textDecoration: "none", paddingLeft: open?8:0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              {open && <span>Dashboard</span>}
            </div>
          </Link>

          <Link to="/instances" style={{ color: "#9CA3AF", textDecoration: "none", paddingLeft: open?8:0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>🖥️</span>
              {open && <span>Instances</span>}
            </div>
          </Link>

          <Link to="/billing" style={{ color: "#9CA3AF", textDecoration: "none", paddingLeft: open?8:0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              {open && <span>Billing</span>}
            </div>
          </Link>

          <Link to="/settings" style={{ color: "#9CA3AF", textDecoration: "none", paddingLeft: open?8:0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18 }}>⚙️</span>
              {open && <span>Settings</span>}
            </div>
          </Link>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.03)" }}>
          {open && <small style={{ color: "#6b7280" }}>Powered by TurboCompute</small>}
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#071018", color: "#fff" }}>
        {/* Topbar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
          <div />
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <NotificationsIcon style={{ color: "#cbd5e1" }} />
            <Avatar sx={{ bgcolor: "#1f2937" }}>M</Avatar>
          </div>
        </header>

        {/* Content */}
        <main style={{ padding: 24, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
