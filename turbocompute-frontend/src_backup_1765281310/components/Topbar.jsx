// src/components/Layout.jsx
import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <CssBaseline />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Topbar onMenuClick={handleDrawerToggle} />
        <Box component="main" sx={{ p: { xs: 2, md: 3 }, width: "100%", overflow: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
