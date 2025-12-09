// layout/MainLayout.jsx
import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CssBaseline from "@mui/material/CssBaseline";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { styled } from "@mui/material/styles";

import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MemoryIcon from "@mui/icons-material/Memory";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TerminalIcon from "@mui/icons-material/Terminal";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";

const DRAWER_WIDTH = 260;

const Main = styled("main", {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(4),
  marginLeft: open ? DRAWER_WIDTH : 0,
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  [theme.breakpoints.down("sm")]: {
    marginLeft: 0,
    padding: theme.spacing(2),
  },
}));

export default function MainLayout({ children }) {
  const [open, setOpen] = React.useState(true);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const location = useLocation();

  const toggleDrawer = () => {
    setOpen((v) => !v);
  };

  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleAvatarClose = () => setAnchorEl(null);

  const navItems = [
    { text: "Home", icon: <HomeIcon />, to: "/" },
    { text: "Dashboard", icon: <DashboardIcon />, to: "/dashboard" },
    { text: "Instances", icon: <MemoryIcon />, to: "/instances" },
    { text: "GPU Logs", icon: <TerminalIcon />, to: "/gpu-logs" },
    { text: "Billing", icon: <ReceiptLongIcon />, to: "/billing" },
    { text: "Settings", icon: <SettingsIcon />, to: "/settings" },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <CssBaseline />

      {/* Top bar */}
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "#0f1720" : "#ffffff",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            sx={{ mr: 2 }}
            aria-label="toggle menu"
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              color: (theme) =>
                theme.palette.mode === "dark" ? "#fff" : "#111827",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            TurboCompute
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <IconButton sx={{ mr: 1 }} aria-label="notifications">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Tooltip title="Account">
            <IconButton onClick={handleAvatarClick} sx={{ ml: 1 }}>
              <Avatar sx={{ width: 34, height: 34 }}>M</Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleAvatarClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem component={RouterLink} to="/dashboard" onClick={handleAvatarClose}>
              Dashboard
            </MenuItem>
            <MenuItem component={RouterLink} to="/billing" onClick={handleAvatarClose}>
              Billing
            </MenuItem>
            <MenuItem onClick={() => { handleAvatarClose(); localStorage.removeItem("tc_token"); window.location.href = "/login"; }}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Left drawer / sidebar */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            background:
              (theme) =>
                theme.palette.mode === "dark" ? "#0b1220" : "#f8fafc",
            color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#0b1220"),
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Toolbar sx={{ px: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              TurboCompute
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Fast GPU cloud
            </Typography>
          </Box>
        </Toolbar>

        <Divider sx={{ my: 1 }} />

        <List>
          {navItems.map((item) => {
            const selected = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.to}
                  sx={{
                    backgroundColor: selected ? (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)") : "transparent",
                    color: "inherit",
                    px: 3,
                  }}
                >
                  <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ px: 3, py: 2 }}>
          <Divider />
          <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.7 }}>
            Powered by TurboCompute
          </Typography>
        </Box>
      </Drawer>

      {/* Main content area */}
      <Main open={open}>
        {/* toolbar spacer so top content begins below appbar */}
        <Toolbar />
        {/* Page content injected here */}
        {children}
      </Main>
    </Box>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node,
};
