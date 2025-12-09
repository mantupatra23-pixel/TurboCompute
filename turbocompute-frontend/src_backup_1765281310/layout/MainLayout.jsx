// src/layout/MainLayout.jsx
import React, { useState, useMemo, useEffect } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  InputBase,
  Badge,
  Tooltip,
  Switch,
  ThemeProvider,
} from "@mui/material";
import { styled } from "@mui/system";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorageIcon from "@mui/icons-material/Storage";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { lightTheme, darkTheme } from "../theme";

const drawerWidth = 260;
const SearchBox = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  background: theme.palette.mode === "light" ? "#f1f3f4" : theme.palette.background.paper,
  padding: "6px 10px",
  borderRadius: theme.shape.borderRadius,
  width: "100%",
  maxWidth: 420,
}));
const StyledInput = styled(InputBase)(({ theme }) => ({
  marginLeft: 8,
  flex: 1,
}));

const navItems = [
  { label: "Home", path: "/", icon: <HomeIcon /> },
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
  { label: "Instances", path: "/instances", icon: <StorageIcon /> },
  { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
];

export default function MainLayout({ children }) {
  const location = useLocation();

  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [mode, setMode] = useState(() => localStorage.getItem("tc_theme") || "dark");

  useEffect(() => localStorage.setItem("tc_theme", mode), [mode]);
  const themeObj = useMemo(() => (mode === "dark" ? darkTheme : lightTheme), [mode]);

  const user = { name: "Mantu Patra", email: "mantu@example.com" };

  const toggleDrawer = () => setOpen((v) => !v);
  const onProfileOpen = (e) => setAnchorEl(e.currentTarget);
  const onProfileClose = () => setAnchorEl(null);
  const openNotifs = (e) => setNotifAnchor(e.currentTarget);
  const closeNotifs = () => setNotifAnchor(null);

  const handleLogout = () => {
    localStorage.removeItem("tc_token");
    window.location.href = "/login";
  };

  return (
    <ThemeProvider theme={themeObj}>
      <CssBaseline />
      <Box sx={{ display: "flex" }}>
        <AppBar
          position="fixed"
          elevation={1}
          sx={{
            width: { md: `calc(100% - ${open ? drawerWidth : 72}px)` },
            ml: { md: `${open ? drawerWidth : 72}px` },
            transition: "all 180ms ease",
            background: themeObj.palette.background.paper,
            color: themeObj.palette.text.primary,
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <IconButton edge="start" onClick={toggleDrawer} aria-label="menu">
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>

            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              TurboCompute
            </Typography>

            <Box sx={{ flex: 1, display: { xs: "none", sm: "block" } }}>
              <SearchBox>
                <SearchIcon color="action" />
                <StyledInput placeholder="Search instances, jobs, users..." inputProps={{ "aria-label": "search" }} />
              </SearchBox>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Toggle theme">
                <Switch checked={mode === "dark"} onChange={() => setMode((m) => (m === "dark" ? "light" : "dark"))} />
              </Tooltip>

              <Tooltip title="Notifications">
                <IconButton onClick={openNotifs} aria-label="notifications">
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Tooltip title={user.name}>
                <IconButton size="small" onClick={onProfileOpen} sx={{ ml: 1 }}>
                  <Avatar sx={{ width: 36, height: 36 }}>{user.name?.[0] || "U"}</Avatar>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={onProfileClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem disabled>
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography variant="subtitle2">{user.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem component={RouterLink} to="/settings" onClick={onProfileClose}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Account Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>

              <Menu
                anchorEl={notifAnchor}
                open={Boolean(notifAnchor)}
                onClose={closeNotifs}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled>You have 3 notifications</MenuItem>
                <Divider />
                <MenuItem>Instance gpu-54 finished setup</MenuItem>
                <MenuItem>Payment confirmed — ₹1,000</MenuItem>
                <MenuItem>New message from support</MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: open ? drawerWidth : 72,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: open ? drawerWidth : 72,
              boxSizing: "border-box",
              transition: "width 180ms ease",
              overflowX: "hidden",
              background: themeObj.palette.background.paper,
            },
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "space-between" : "center",
              px: 2,
            }}
          >
            {open ? <Typography variant="h6" sx={{ fontWeight: 700 }}>TurboCompute</Typography> : <Avatar sx={{ bgcolor: "primary.main" }}>TU</Avatar>}
          </Toolbar>

          <Divider />

          <List>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItem
                  button
                  key={item.label}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    py: 1.1,
                    px: 2,
                    ...(active && {
                      background: (t) => t.palette.action.selected,
                      borderLeft: "4px solid",
                      borderColor: "primary.main",
                      "& .MuiListItemIcon-root": { color: "primary.main" },
                    }),
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  {open && <ListItemText primary={item.label} />}
                </ListItem>
              );
            })}
          </List>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ p: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" display={open ? "block" : "none"}>
              Powered by TurboCompute
            </Typography>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8 }}>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
