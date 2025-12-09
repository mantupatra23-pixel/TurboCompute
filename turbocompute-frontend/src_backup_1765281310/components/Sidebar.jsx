// src/components/Sidebar.jsx
import React from "react";
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, Box } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ComputerIcon from "@mui/icons-material/Computer";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import { useNavigate } from "react-router-dom";

const drawerWidth = 260;

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate();

  const menu = [
    { title: "Home", icon: <HomeIcon />, path: "/" },
    { title: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { title: "Instances", icon: <ComputerIcon />, path: "/instances" },
    { title: "Billing", icon: <ReceiptIcon />, path: "/billing" },
    { title: "Settings", icon: <SettingsIcon />, path: "/settings" }
  ];

  const content = (
    <Box sx={{ height: "100%", bgcolor: "background.paper", color: "text.primary" }}>
      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ fontWeight: 700, fontSize: 18 }}>TurboCompute</Box>
      </Toolbar>
      <Divider />
      <List>
        {menu.map((m) => (
          <ListItemButton key={m.title} onClick={() => { navigate(m.path); if (onClose) onClose(); }}>
            <ListItemIcon sx={{ color: "text.secondary" }}>{m.icon}</ListItemIcon>
            <ListItemText primary={m.title} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2, color: "text.secondary", fontSize: 12 }}>
        Powered by TurboCompute
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "background.default",
            borderRight: "1px solid rgba(255,255,255,0.04)"
          },
        }}
        open
      >
        {content}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" }
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
