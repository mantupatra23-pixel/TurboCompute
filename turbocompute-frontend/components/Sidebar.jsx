// components/Sidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Divider,
  useTheme,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MemoryIcon from "@mui/icons-material/Memory";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TerminalIcon from "@mui/icons-material/Terminal";

const drawerWidth = 260;

const navItems = [
  { label: "Home", path: "/", icon: <HomeIcon /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Instances", path: "/instances", icon: <MemoryIcon /> },
  { label: "GPU Logs", path: "/gpu-logs", icon: <TerminalIcon /> },
  { label: "Billing", path: "/billing", icon: <AccountBalanceWalletIcon /> },
  { label: "Invoices", path: "/invoices", icon: <ReceiptLongIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const theme = useTheme();

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ px: 2, justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>T</Avatar>
          <Box>
            <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
              TurboCompute
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Fast GPU cloud
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      <Box sx={{ p: 1 }}>
        <List disablePadding>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={onClose}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: "text.primary",
                "&.active": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                  },
                },
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ p: 2 }}>
        <Divider />
        <Box sx={{ display: "flex", alignItems: "center", mt: 1, gap: 1 }}>
          <Avatar sx={{ width: 36, height: 36 }}>M</Avatar>
          <Box>
            <Typography variant="body2">Mantu Patra</Typography>
            <Typography variant="caption" color="text.secondary">
              Premium
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Powered by TurboCompute
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Permanent drawer for desktop */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.default",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Temporary drawer for mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "background.default",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
